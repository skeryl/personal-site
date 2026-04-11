<script lang="ts">
	import { type ContentParam, type ContentParams, ParamType } from '$lib/content-params/index.js';
	import ParamInput from '$lib/components/content-params/ParamInput.svelte';
	import Icon from '$lib/components/icons/Icon.svelte';

	interface Props {
		params: ContentParams;
		onParamsChange: (p: ContentParams) => void;
		onSave: (p: ContentParams) => void;
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
	<div class="param-row">
		<button class="action-icon cancel-icon" onclick={onCancel} aria-label="Cancel changes">
			<Icon type="circle-x" size="sm" className="!text-inherit hover:!text-inherit" />
		</button>
		<div class="param-tabs">
			{#each params as param, i}
				<button
					class="param-tab"
					class:active={i === activeIndex}
					onclick={() => (activeIndex = i)}
				>
					{param.name}
					{#if i === activeIndex}
						<span class="param-value">{formatValue(param)}</span>
					{/if}
				</button>
			{/each}
		</div>
		<button class="action-icon save-icon" onclick={() => onSave(params)} aria-label="Save changes">
			<Icon type="circle-check" size="sm" className="!text-inherit hover:!text-inherit" />
		</button>
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
		padding: 0.5rem 3.5rem;
	}

	.param-row {
		display: flex;
		align-items: center;
		padding: 0 0.5rem 0.5rem;
		gap: 0.5rem;
	}

	.param-tabs {
		display: flex;
		overflow-x: auto;
		overflow-y: clip;
		gap: 0.375rem;
		flex: 1;
		min-width: 0;
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

	.action-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		transition: all 0.15s;
	}

	.cancel-icon {
		color: var(--color-text-muted);
		background: var(--color-surface-active);
	}

	.cancel-icon:hover {
		color: var(--color-text-secondary);
		background: var(--color-border);
	}

	.save-icon {
		color: var(--color-surface-secondary);
		background: var(--color-surface-active-strong);
	}

	.save-icon:hover {
		background: var(--color-text-heading);
	}
</style>
