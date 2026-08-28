<script lang="ts">
	import { getAt, pathKey, type CalcNode } from './ast';
	import { traceEvaluate, type EvalResult } from './evaluate';
	import { effectiveVersion } from './library';
	import { OPERATOR_BY_ID, type Value } from './operators';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();

	let filter = $state('');
	let sampleIndex = $state(0);
	/** -1 = not started; otherwise an index into the trace. */
	let stepIndex = $state(-1);

	const samples = $derived(store.model.samples);
	const matches = $derived(
		samples
			.map((sample, index) => ({ sample, index }))
			.filter(({ sample }) => sample.label.toLowerCase().includes(filter.trim().toLowerCase()))
	);
	const sample = $derived(samples[sampleIndex] ?? samples[0]);
	const steps = $derived(traceEvaluate(store.root, sample.values, store.library).steps);

	/* Restart the walkthrough when the tree, record, or model changes. */
	$effect(() => {
		void store.root;
		void store.modelId;
		void sampleIndex;
		stepIndex = -1;
	});

	/* The tree editor highlights whichever node the debugger is on. */
	$effect(() => {
		store.debugKey =
			stepIndex >= 0 && stepIndex < steps.length ? pathKey(steps[stepIndex].path) : null;
		return () => {
			store.debugKey = null;
		};
	});

	const reset = () => (stepIndex = -1);
	const prev = () => (stepIndex = Math.max(-1, stepIndex - 1));
	const next = () => (stepIndex = Math.min(steps.length - 1, stepIndex + 1));
	const finish = () => (stepIndex = steps.length - 1);

	const describe = (node: CalcNode | null): string => {
		if (node === null) return 'empty slot';
		switch (node.kind) {
			case 'field':
				return node.field;
			case 'literal':
				return typeof node.value === 'string' ? `"${node.value}"` : String(node.value);
			case 'calc': {
				const def = store.library.find((entry) => entry.id === node.calcId);
				return def ? `ƒ ${effectiveVersion(def).label}` : `@${node.calcId}`;
			}
			case 'op':
				return OPERATOR_BY_ID[node.op].label;
			case 'switch':
				return 'switch';
			case 'map':
				return 'map';
		}
	};

	const fmtValue = (value: Value): string => {
		if (Array.isArray(value)) {
			return `[${value.map((entry) => (typeof entry === 'object' ? '{…}' : entry)).join(', ')}]`;
		}
		return typeof value === 'object' ? '{…}' : String(value);
	};
	const fmt = (result: EvalResult): string => (result.ok ? fmtValue(result.value) : result.error);
</script>

<div class="debugger" data-debugger>
	<p class="hint">
		Pick a record, then step the evaluation: each node produces its value in order, and the tree
		highlights the current step. This is the self-service walkthrough the interviews asked for.
	</p>
	<input
		class="record-filter"
		type="text"
		placeholder="Search records…"
		aria-label="Search records"
		bind:value={filter}
	/>
	<div class="records">
		{#each matches as entry (entry.sample.label)}
			<button
				class="tool-btn"
				class:active={entry.index === sampleIndex}
				data-debug-record={entry.sample.label}
				onclick={() => (sampleIndex = entry.index)}
			>
				{entry.sample.label}
			</button>
		{/each}
		{#if matches.length === 0}
			<span class="hint">No records match.</span>
		{/if}
	</div>
	<div class="controls">
		<button class="tool-btn" data-debug-reset onclick={reset} disabled={stepIndex < 0}>
			⏮ Reset
		</button>
		<button class="tool-btn" data-debug-prev onclick={prev} disabled={stepIndex < 0}>←</button>
		<button
			class="tool-btn"
			data-debug-next
			onclick={next}
			disabled={stepIndex >= steps.length - 1}
		>
			Step →
		</button>
		<button
			class="tool-btn"
			data-debug-finish
			onclick={finish}
			disabled={stepIndex >= steps.length - 1}
		>
			⏭
		</button>
		<span class="counter" data-debug-counter>{stepIndex + 1} / {steps.length}</span>
	</div>
	{#if stepIndex < 0}
		<p class="hint">Press Step to begin. Evaluation runs bottom-up: inputs before operators.</p>
	{:else}
		<ol class="steps">
			{#each steps as step, index (index)}
				{#if index <= stepIndex}
					<li class="step" class:current={index === stepIndex} data-debug-step>
						<span class="step-label">{describe(getAt(store.root, step.path))}</span>
						{#if step.note}
							<span class="step-note">{step.note}</span>
						{/if}
						<span class="step-value" class:error={!step.result.ok}>{fmt(step.result)}</span>
					</li>
				{/if}
			{/each}
		</ol>
		{#if stepIndex === steps.length - 1}
			<p class="verdict" data-debug-done>
				Evaluation finished: the root produced
				<strong class:error={!steps[stepIndex].result.ok}>{fmt(steps[stepIndex].result)}</strong>
				for {sample.label}.
			</p>
		{/if}
	{/if}
</div>

<style>
	.debugger {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.record-filter {
		font: inherit;
		font-size: 0.8rem;
		padding: 0.3rem 0.55rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.375rem;
		background: none;
		color: inherit;
	}
	.record-filter:focus {
		outline: none;
		border-color: var(--cb-accent);
	}
	.records {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.counter {
		margin-left: auto;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
	}
	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		max-height: 22rem;
		overflow: auto;
	}
	.step {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 0.78rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid transparent;
	}
	.step.current {
		border-color: var(--cb-accent);
		background: color-mix(in srgb, var(--cb-accent) 7%, transparent);
	}
	.step-label {
		color: var(--color-text-strong);
	}
	.step-note {
		font-size: 0.68rem;
		color: var(--color-text-muted);
	}
	.step-value {
		margin-left: auto;
		font-family: var(--font-mono, monospace);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 11rem;
	}
	.step-value.error,
	.verdict .error {
		color: var(--cb-error);
	}
	.verdict {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin: 0;
	}
	.verdict strong {
		font-family: var(--font-mono, monospace);
	}
</style>
