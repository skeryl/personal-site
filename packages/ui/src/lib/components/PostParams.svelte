<script lang="ts">
	import { type ContentParam, type ContentParams, ParamType } from '$lib/content-params/index.js';
	import ParamInput from '$lib/components/content-params/ParamInput.svelte';

	interface Props {
		params: ContentParams;
		onParamsChange: (p: ContentParams) => void;
		onSave: () => void;
		onCancel: () => void;
	}

	let { params = $bindable(), onParamsChange, onSave, onCancel }: Props = $props();

	let activeIndex = $state(0);
	let activeParam = $derived(params[activeIndex]);

	function formatValue(param: ContentParam<ParamType>): string {
		if (param.type === ParamType.number && typeof param.value === 'number') {
			return param.value % 1 === 0 ? param.value.toString() : param.value.toFixed(3);
		}
		return String(param.value ?? '');
	}

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
				{#if i === activeIndex}
					<span class="param-value">{formatValue(param)}</span>
				{/if}
			</button>
		{/each}
	</div>
</div>
<div class="action-bar">
	<button class="action-btn cancel-btn" onclick={onCancel}>Cancel</button>
	<button class="action-btn save-btn" onclick={onSave}>Save</button>
</div>

<style>
	.params-strip {
		background: color-mix(in srgb, var(--color-surface) 82%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid var(--color-border-subtle);
	}

	.param-control {
		padding: 0.5rem 0.75rem;
	}

	.param-tabs {
		display: flex;
		overflow-x: auto;
		gap: 0.375rem;
		padding: 0 0.75rem 0.5rem;
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
		transition:
			all 0.2s ease,
			transform 0.2s ease;
		white-space: nowrap;
	}

	.param-tab:hover {
		color: var(--color-text);
	}

	.param-tab.active {
		color: var(--color-text-heading);
		background: var(--color-surface-active);
		border-color: var(--color-border);
		transform: scale(1.08);
	}

	.param-value {
		margin-left: 0.25rem;
		font-variant-numeric: tabular-nums;
		opacity: 0.6;
	}

	.action-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 3rem;
		padding: 0 0.75rem;
		background-color: var(--color-surface);
	}

	.action-btn {
		padding: 0.375rem 1.25rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		border: none;
	}

	.cancel-btn {
		color: var(--color-text-secondary);
		background: transparent;
	}

	.cancel-btn:hover {
		color: var(--color-text);
	}

	.save-btn {
		color: var(--color-text-strong);
		background: var(--color-surface-active);
		border: 1px solid var(--color-border);
	}

	.save-btn:hover {
		background: var(--color-border);
	}
</style>
