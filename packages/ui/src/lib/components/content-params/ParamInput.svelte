<script lang="ts">
	import { type ContentParam, ParamType, type Vec2 } from '$lib/content-params/index.js';
	import Input from '$lib/components/controls/Input.svelte';
	import Vec2Input from '$lib/components/controls/Vec2Input.svelte';

	interface Props {
		param: ContentParam<ParamType>;
		onChange: (p: ContentParam<ParamType>) => void;
	}

	let { param, onChange }: Props = $props();

	function onNumberParamChanged(e: Event) {
		const value = Number((e.target as HTMLInputElement).value);
		onChange({ ...param, value });
	}

	function onStringSelectChanged(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		onChange({ ...param, value });
	}

	function onColorChanged(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		onChange({ ...param, value });
	}

	function onVec2ValueChanged(vec2: Vec2) {
		onChange({ ...param, value: vec2 });
	}

	let inputId = $derived(`param-${param.id}`);
	let numberRange = $derived(
		param.range as { min: number; max: number; step?: number | 'any' } | undefined
	);
	let vec2Value = $derived(param.value as unknown as Vec2);
</script>

<div class="flex-col px-2">
	{#if param.type === ParamType.number}
		{#if numberRange}
			<Input
				class="w-full"
				type="range"
				min={numberRange.min}
				max={numberRange.max}
				step={numberRange.step ?? 'any'}
				onChange={onNumberParamChanged}
				value={param.value}
				label={param.name}
				name={inputId}
			/>
			<span class="text-xs text-neutral-500">{param.value}</span>
		{:else}
			<Input
				wrapperClass="w-full"
				id={inputId}
				type="number"
				value={param.value}
				onChange={onNumberParamChanged}
				label={param.name}
				name={inputId}
			/>
		{/if}
	{:else if param.type === ParamType.vec2}
		<div class="flex">
			<Vec2Input label={param.name} value={vec2Value} onChange={onVec2ValueChanged} />
		</div>
	{:else if param.type === ParamType.string && param.options}
		<div class="flex flex-col">
			<label for={inputId} class="text-xs font-bold">{param.name}</label>
			<select
				id={inputId}
				class="rounded text-md px-2 py-1"
				value={param.value}
				onchange={onStringSelectChanged}
			>
				{#each param.options as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>
	{:else if param.type === ParamType.color}
		<div class="flex flex-col gap-1">
			<label for={inputId} class="text-xs font-bold">{param.name}</label>
			<input
				id={inputId}
				type="color"
				value={param.value}
				oninput={onColorChanged}
				class="h-8 w-16 cursor-pointer rounded border-0 p-0.5"
			/>
		</div>
	{:else}
		<input id={inputId} type="text" />
	{/if}
</div>
