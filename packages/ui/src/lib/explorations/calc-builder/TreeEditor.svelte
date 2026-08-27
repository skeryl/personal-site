<script lang="ts">
	import Icon from '$lib/components/icons/Icon.svelte';
	import { effectiveVersion } from './library';
	import Slot from './Slot.svelte';
	import TreeNode from './TreeNode.svelte';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();
</script>

<section class="tree-editor">
	<div class="editor-head">
		<div class="title-row">
			<input
				class="calc-title"
				type="text"
				placeholder="Untitled calc"
				aria-label="Calculation name"
				maxlength="60"
				bind:value={store.calcName}
				onkeydown={(e) => {
					if (e.key === 'Enter') e.currentTarget.blur();
				}}
			/>
			{#if store.dirty}
				<span class="unsaved-tag">unsaved</span>
			{/if}
		</div>
		<div class="editor-actions">
			<button
				class="tool-btn"
				data-new-calc
				onclick={() => store.newCalc()}
				title="Start a fresh calculation"
			>
				<Icon type="file-plus" size="xs" className="!text-inherit hover:!text-inherit" />
				New
			</button>
			<button
				class="tool-btn"
				data-save-calc
				onclick={() => store.saveToLibrary()}
				disabled={!store.checkResult.complete}
				title="Append a new draft version to the library; publish it from the History tab"
			>
				<Icon type="device-floppy" size="xs" className="!text-inherit hover:!text-inherit" />
				Save draft
			</button>
			<button
				class="tool-btn"
				data-revert-calc
				onclick={() => store.revert()}
				disabled={!store.dirty}
				title="Discard edits and restore the saved state"
			>
				<Icon type="arrow-back-up" size="xs" className="!text-inherit hover:!text-inherit" />
				Revert
			</button>
			<button
				class="tool-btn clear"
				onclick={() => store.clearAll()}
				disabled={store.root === null}
			>
				<Icon type="eraser" size="xs" className="!text-inherit hover:!text-inherit" />
				Clear
			</button>
		</div>
	</div>
	<div class="canvas">
		{#if store.root === null}
			<Slot {store} path={[]} />
			<p class="hint">
				This empty slot is the root of the calculation. Start here, or load one from the Library
				tab.
			</p>
		{:else}
			<TreeNode {store} node={store.root} path={[]} />
		{/if}
	</div>

	{#if store.referencedIn.length > 0}
		<div class="referenced-in">
			<span class="group-label">Referenced in</span>
			{#each store.referencedIn as def (def.id)}
				{@const label = effectiveVersion(def).label}
				<button
					class="tool-btn ref-chip"
					data-ref-in={def.id}
					onclick={() => store.loadCalc(def.id)}
					title={`Open "${label}"`}
				>
					<span class="calc-mark">ƒ</span>
					{label}
				</button>
			{/each}
		</div>
	{/if}
</section>

<style>
	.editor-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.title-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex: 1;
		min-width: 0;
	}
	.calc-title {
		flex: 1;
		min-width: 0;
		font: inherit;
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--color-text-strong);
		background: none;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		padding: 0.1rem 0.4rem;
		margin-left: -0.4rem;
	}
	.calc-title:hover {
		border-color: var(--color-border-strong);
		background: var(--color-surface-active);
		cursor: text;
	}
	.calc-title:focus {
		outline: none;
		border-color: var(--cb-accent);
	}
	.unsaved-tag {
		font-size: 0.72rem;
		color: var(--color-text-muted);
		border: 1px dashed var(--color-border-strong);
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		white-space: nowrap;
	}
	.editor-actions {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}
	.editor-actions .tool-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.referenced-in {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.75rem;
	}
	.referenced-in .group-label {
		margin: 0 0.35rem 0 0;
	}
	.ref-chip .calc-mark {
		font-style: italic;
		font-weight: 700;
		color: var(--cb-accent);
		margin-right: 0.15rem;
	}
	.canvas {
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.5rem;
		padding: 1.25rem;
		min-height: 16rem;
	}
	.canvas > :global(.hint) {
		margin-top: 0.75rem;
	}
</style>
