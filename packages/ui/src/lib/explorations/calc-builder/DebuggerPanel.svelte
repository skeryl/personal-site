<script lang="ts">
	import { getAt, pathKey, type CalcNode } from './ast';
	import { traceEvaluate, type EvalResult, type TraceStep } from './evaluate';
	import { effectiveVersion } from './library';
	import { OPERATOR_BY_ID, type Value } from './operators';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();

	let filter = $state('');
	let sampleIndex = $state(0);

	const samples = $derived(store.model.samples);
	const matches = $derived(
		samples
			.map((sample, index) => ({ sample, index }))
			.filter(({ sample }) => sample.label.toLowerCase().includes(filter.trim().toLowerCase()))
	);
	const sample = $derived(samples[sampleIndex] ?? samples[0]);
	const rootSteps = $derived(traceEvaluate(store.root, sample.values, store.library).steps);

	/** One stack frame: the root frame plus one per stepped-into reference. */
	interface Frame {
		steps: TraceStep[];
		index: number;
		label: string;
		/** pathKey of the root-tree ƒ leaf this call descends from. */
		refKey: string | null;
		root: CalcNode | null;
	}

	let frames = $state<Frame[]>([{ steps: [], index: -1, label: 'root', refKey: null, root: null }]);

	/* Restart the walkthrough when the tree, record, or model changes. */
	$effect(() => {
		frames = [{ steps: rootSteps, index: -1, label: 'root', refKey: null, root: store.root }];
	});

	const current = $derived(frames[frames.length - 1]);
	const nextStep = $derived(current.steps[current.index + 1]);
	const atEnd = $derived(current.index >= current.steps.length - 1);
	const canInto = $derived(nextStep !== undefined && (nextStep.sub?.length ?? 0) > 0);
	const started = $derived(frames.length > 1 || current.index >= 0);
	const finished = $derived(frames.length === 1 && atEnd && current.steps.length > 0);

	/* The tree editor highlights the current step, or the ƒ leaf being
	   stepped into while a call frame is open. */
	$effect(() => {
		const top = frames[frames.length - 1];
		if (frames.length > 1) {
			store.debugKey = frames[1].refKey;
		} else {
			store.debugKey =
				top.index >= 0 && top.index < top.steps.length ? pathKey(top.steps[top.index].path) : null;
		}
		return () => {
			store.debugKey = null;
		};
	});

	const bumpTop = (delta: number) => {
		frames = frames.map((frame, index) =>
			index === frames.length - 1 ? { ...frame, index: frame.index + delta } : frame
		);
	};

	const reset = () => {
		frames = [{ steps: rootSteps, index: -1, label: 'root', refKey: null, root: store.root }];
	};

	const next = () => {
		if (!atEnd) {
			bumpTop(1);
		} else if (frames.length > 1) {
			// Stepping past a frame's last step returns to the caller, landing
			// on the call itself with its computed result.
			frames = frames
				.slice(0, -1)
				.map((frame, index, arr) =>
					index === arr.length - 1 ? { ...frame, index: frame.index + 1 } : frame
				);
		}
	};

	const prev = () => {
		if (current.index >= 0) bumpTop(-1);
		else if (frames.length > 1) frames = frames.slice(0, -1);
	};

	const stepInto = () => {
		const step = nextStep;
		if (step === undefined || step.sub === undefined || step.sub.length === 0) return;
		const callNode = getAt(current.root, step.path);
		const def =
			callNode !== null && callNode.kind === 'calc'
				? store.library.find((entry) => entry.id === callNode.calcId)
				: undefined;
		frames = [
			...frames,
			{
				steps: step.sub,
				index: -1,
				label: def ? `ƒ ${effectiveVersion(def).label}` : 'ƒ ?',
				refKey: frames.length === 1 ? pathKey(step.path) : current.refKey,
				root: def ? effectiveVersion(def).root : null
			}
		];
	};

	const finish = () => bumpTop(current.steps.length - 1 - current.index);

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
		highlights the current step. Step into a ƒ reference to walk its own evaluation.
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
		<button class="tool-btn" data-debug-reset onclick={reset} disabled={!started}>⏮ Reset</button>
		<button class="tool-btn" data-debug-prev onclick={prev} disabled={!started}>←</button>
		<button class="tool-btn" data-debug-next onclick={next} disabled={finished}>Step →</button>
		<button class="tool-btn" data-debug-into onclick={stepInto} disabled={!canInto}>
			↳ Into
		</button>
		<button class="tool-btn" data-debug-finish onclick={finish} disabled={atEnd}>⏭</button>
		<span class="counter" data-debug-counter>{current.index + 1} / {current.steps.length}</span>
	</div>
	{#if frames.length > 1}
		<div class="crumbs" data-debug-crumbs>
			{frames.map((frame) => frame.label).join(' ▸ ')}
		</div>
	{/if}
	{#if !started}
		<p class="hint">Press Step to begin. Evaluation runs bottom-up: inputs before operators.</p>
	{:else}
		<ol class="steps">
			{#each current.steps as step, index (index)}
				{#if index <= current.index}
					<li class="step" class:current={index === current.index} data-debug-step>
						<span class="step-label">{describe(getAt(current.root, step.path))}</span>
						{#if step.note}
							<span class="step-note">{step.note}</span>
						{/if}
						{#if (step.sub?.length ?? 0) > 0}
							<span class="step-note">call · {step.sub?.length} steps</span>
						{/if}
						<span class="step-value" class:error={!step.result.ok}>{fmt(step.result)}</span>
					</li>
				{/if}
			{/each}
		</ol>
		{#if finished}
			<p class="verdict" data-debug-done>
				Evaluation finished: the root produced
				<strong class:error={!current.steps[current.index].result.ok}>
					{fmt(current.steps[current.index].result)}
				</strong>
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
	.crumbs {
		font-size: 0.75rem;
		color: var(--cb-accent);
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
