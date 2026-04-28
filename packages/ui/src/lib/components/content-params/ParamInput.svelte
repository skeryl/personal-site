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

	let hexDraft = $state(param.value as string);

	function hexToRgb(hex: string): string {
		if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '';
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `${r}, ${g}, ${b}`;
	}

	let rgbDisplay = $derived(hexToRgb(hexDraft));

	function onColorChanged(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		hexDraft = value;
		onChange({ ...param, value });
	}

	function onHexTextInput(e: Event) {
		hexDraft = (e.target as HTMLInputElement).value;
		if (/^#[0-9a-fA-F]{6}$/.test(hexDraft)) {
			onChange({ ...param, value: hexDraft });
		}
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

<div class="flex flex-col w-full">
	{#if param.type === ParamType.number}
		{#if numberRange}
			<Input
				wrapperClass="w-full"
				class="w-full"
				type="range"
				min={numberRange.min}
				max={numberRange.max}
				step={numberRange.step ?? 'any'}
				onChange={onNumberParamChanged}
				onInput={onNumberParamChanged}
				value={param.value}
				name={inputId}
			/>
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
				class="rounded text-md px-2 py-2 min-h-[44px]"
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
			<div class="flex items-center gap-2">
				<input
					id={inputId}
					type="color"
					value={param.value}
					oninput={onColorChanged}
					class="h-8 w-10 cursor-pointer rounded border-0 p-0.5"
				/>
				<div class="flex flex-col gap-0.5">
					<input
						type="text"
						value={hexDraft}
						oninput={onHexTextInput}
						maxlength={7}
						class="w-24 rounded border border-neutral-300 bg-transparent px-2 py-1 font-mono text-xs"
						placeholder="#000000"
					/>
					{#if rgbDisplay}
						<span class="font-mono text-xs opacity-50">{rgbDisplay}</span>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<input id={inputId} type="text" />
	{/if}
</div>
