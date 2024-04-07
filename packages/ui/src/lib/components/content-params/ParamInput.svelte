<script lang="ts">
	import { type ContentParam, ParamType, type Vec2 } from '$lib/content-params/index.js';
	import Input from '$lib/components/controls/Input.svelte';
	import Vec2Input from '$lib/components/controls/Vec2Input.svelte';

	export let param: ContentParam<ParamType>;
	export let onChange: (p: ContentParam<ParamType>) => void;

	function onNumberParamChanged(e: Event) {
		console.log('number param changed');
		const value = Number((e.target as HTMLInputElement).value);
		onChange({ ...param, value });
	}

	function onVec2ValueChanged(vec2: Vec2) {
		onChange({ ...param, value: vec2 });
	}

	$: inputId = `param-${param.id}`;
</script>

<div class="flex-col px-2">
	{#if param.type === ParamType.number}
		{#if param.range}
			<Input
				class="w-full"
				type="range"
				min={param.range.min}
				max={param.range.max}
				step={param.range.step ?? 'any'}
				onChange={onNumberParamChanged}
				value={param.value}
				label={param.name}
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
			<Vec2Input label={param.name} value={param.value} onChange={onVec2ValueChanged} />
		</div>
	{:else}
		<input id={inputId} type="text" />
	{/if}
</div>
