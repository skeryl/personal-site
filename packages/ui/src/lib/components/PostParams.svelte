<script lang="ts">
	import { type ContentParam, type ContentParams, ParamType } from '$lib/content-params/index.js';
	import ParamInput from '$lib/components/content-params/ParamInput.svelte';

	interface Props {
		params: ContentParams;
		onParamsChange: (p: ContentParams) => void;
	}

	let { params = $bindable(), onParamsChange }: Props = $props();

	let activeIndex = $state(0);
	let activeParam = $derived(params[activeIndex]);

	function onParamChange(changedParam: ContentParam<ParamType>) {
		if (params && onParamsChange) {
			const newParams = params.map((p) => (p.id === changedParam.id ? changedParam : p));
			onParamsChange(newParams);
			params = newParams;
		}
	}
</script>

<div class="params-strip">
	<div class="param-control">
		<ParamInput param={activeParam} onChange={onParamChange} />
	</div>
	<div class="param-tabs">
		{#each params as param, i}
			<button class="param-tab" class:active={i === activeIndex} onclick={() => (activeIndex = i)}>
				{param.name}
			</button>
		{/each}
	</div>
</div>

<style>
	.params-strip {
		background: color-mix(in srgb, var(--color-surface) 82%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid var(--color-border-subtle);
	}

	.param-control {
		padding: 0.5rem 0.75rem 0;
	}

	.param-tabs {
		display: flex;
		overflow-x: auto;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.param-tabs::-webkit-scrollbar {
		display: none;
	}

	.param-tab {
		flex-shrink: 0;
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		background: transparent;
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.param-tab:hover {
		color: var(--color-text);
	}

	.param-tab.active {
		color: var(--color-text-heading);
		background: var(--color-surface-active);
		border-color: var(--color-border);
	}
</style>
