<script lang="ts">
	import { typeClass } from './ast';
	import { resolveField, type EvalError, type EvalResult } from './evaluate';
	import type { Value } from './operators';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();

	const ERROR_LABELS: Record<EvalError, string> = {
		incomplete: '—',
		'div-by-zero': '÷0',
		'empty-array': 'empty array',
		'no-case-match': 'no case matched',
		'no-match': 'no match',
		'unknown-field': 'unknown field',
		'unknown-calc': 'unknown calc',
		circular: 'circular reference',
		'type-mismatch': 'type mismatch'
	};

	const fmtNum = (value: number): string =>
		Number.isInteger(value) ? String(value) : String(Math.round(value * 10000) / 10000);

	const fmtValue = (value: Value): string => {
		if (typeof value === 'number') return fmtNum(value);
		if (typeof value === 'string') return `"${value}"`;
		if (typeof value === 'boolean') return String(value);
		if (Array.isArray(value)) return `[${value.map(fmtValue).join(', ')}]`;
		return Object.values(value).map(fmtValue).join(' ');
	};

	const fmtResult = (result: EvalResult): string =>
		result.ok ? fmtValue(result.value) : ERROR_LABELS[result.error];
</script>

<div class="results-panel">
	{#if store.checkResult.complete && store.checkResult.resultType !== null}
		<p class="status" data-status="complete">
			Result type
			<span class="type-badge t-{typeClass(store.checkResult.resultType)}">
				{store.checkResult.resultType}
			</span>
		</p>
	{:else}
		<p class="status" data-status="incomplete">
			{store.checkResult.emptySlots.length}
			{store.checkResult.emptySlots.length === 1 ? 'empty slot' : 'empty slots'}
		</p>
	{/if}
	{#each store.checkResult.issues as issue (issue.message)}
		<p class="issue" data-issue>{issue.message}</p>
	{/each}

	<div class="rows">
		{#each store.results as { sample, result } (sample.id)}
			<div class="result-row" data-sample-id={sample.id}>
				<div class="sample">
					<span class="sample-label">{sample.label}</span>
					<span class="sample-values">
						{store.model.fields
							.map(
								(field) =>
									`${field.label}: ${fmtValue(resolveField(sample.values, field.id) ?? '')}`
							)
							.join('  ')}
					</span>
				</div>
				<span class="result-value" class:error={!result.ok && result.error !== 'incomplete'}>
					{fmtResult(result)}
				</span>
			</div>
		{/each}
	</div>
	<p class="hint">
		Each row evaluates the calculation against one sample record of the selected model.
	</p>
</div>

<style>
	.status {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		margin: 0 0 0.6rem;
	}
	.issue {
		font-size: 0.8rem;
		color: var(--cb-error);
		margin: 0 0 0.4rem;
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.result-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.375rem;
		padding: 0.5rem 0.65rem;
	}
	.sample {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}
	.sample-label {
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-text-strong);
	}
	.sample-values {
		font-size: 0.7rem;
		color: var(--color-text-muted);
		font-family: var(--font-mono, monospace);
		overflow-wrap: anywhere;
	}
	.result-value {
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		color: var(--color-text-strong);
		white-space: nowrap;
	}
	.result-value.error {
		color: var(--cb-error);
		font-weight: 500;
		font-size: 0.8rem;
	}
</style>
