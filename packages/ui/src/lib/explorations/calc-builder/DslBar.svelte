<script lang="ts">
	import { nodesEqual, parseCalc, printCalc } from './dsl';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();

	let draft = $state('');
	let editing = $state(false);

	const printed = $derived(printCalc(store.root));
	const parsed = $derived(parseCalc(draft));
	const showError = $derived(editing && draft.trim() !== '' && !parsed.ok);

	/* Tree edits rewrite the bar unless the user is mid-edit in it. */
	$effect(() => {
		if (!editing) draft = printed;
	});

	const apply = () => {
		if (!parsed.ok) return;
		if (!nodesEqual(parsed.root, store.root)) store.applyDsl(parsed.root);
		// Dropping out of editing lets the sync effect normalize the text.
		editing = false;
	};

	const revert = () => {
		draft = printed;
		editing = false;
	};

	const onKeydown = (e: KeyboardEvent) => {
		// Enter on an invalid draft keeps focus so the error stays visible.
		if (e.key === 'Enter' && parsed.ok) {
			apply();
			(e.target as HTMLInputElement).blur();
		}
		if (e.key === 'Escape') {
			revert();
			(e.target as HTMLInputElement).blur();
		}
	};

	const onBlur = () => {
		if (parsed.ok) apply();
		else revert();
	};
</script>

<div class="dsl-bar">
	<input
		type="text"
		class="dsl-input"
		class:invalid={showError}
		spellcheck="false"
		autocomplete="off"
		placeholder={'type an expression, e.g. price * quantity or avg(pluck(instrument.creditRatings, "score"))'}
		aria-label="Calculation expression"
		bind:value={draft}
		onfocus={() => (editing = true)}
		oninput={() => (editing = true)}
		onkeydown={onKeydown}
		onblur={onBlur}
	/>
	{#if showError && !parsed.ok}
		<p class="dsl-error" data-dsl-error>
			{parsed.error}{parsed.position !== undefined ? ` (at position ${parsed.position})` : ''}
		</p>
	{:else}
		<p class="hint dsl-hint">
			The expression and the builder below are two views of the same calculation; edit either. Enter
			applies, Escape reverts.
		</p>
	{/if}
</div>

<style>
	.dsl-bar {
		margin-bottom: 1.5rem;
	}
	.dsl-input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.55rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 0.5rem;
		background: none;
		color: var(--color-text-strong);
		font-family: var(--font-mono, monospace);
		font-size: 0.9rem;
	}
	.dsl-input:focus {
		outline: none;
		border-color: var(--cb-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-accent) 25%, transparent);
	}
	.dsl-input.invalid {
		border-color: var(--cb-error);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-error) 20%, transparent);
	}
	.dsl-error {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: var(--cb-error);
	}
	.dsl-hint {
		margin: 0.35rem 0 0;
	}
</style>
