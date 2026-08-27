<script lang="ts">
	import DefinitionPanel from './DefinitionPanel.svelte';
	import DslBar from './DslBar.svelte';
	import HistoryPanel from './HistoryPanel.svelte';
	import LibraryPanel from './LibraryPanel.svelte';
	import ModelPicker from './ModelPicker.svelte';
	import OperatorPalette from './OperatorPalette.svelte';
	import ResultsPanel from './ResultsPanel.svelte';
	import TreeEditor from './TreeEditor.svelte';
	import { CalcStore } from './state.svelte';

	const store = new CalcStore();

	/* Autosave the working state, debounced so bursts of edits are one write. */
	const AUTOSAVE_MS = 250;
	$effect(() => {
		void store.workingState;
		const timer = setTimeout(() => store.persistWorking(), AUTOSAVE_MS);
		return () => clearTimeout(timer);
	});
</script>

<svelte:window
	onkeydown={(e) => store.onKeyDown(e)}
	onpointerdowncapture={(e) => store.onPointerDownCapture(e)}
/>

<div class="exploration">
	<header class="hero">
		<h1>Calc Builder</h1>
		<p class="subtitle">
			Rebuilding an old work project: define a calculation as an expression tree over a data model,
			then watch it evaluate live against sample records. Pick a slot, fill it from the palette,
			repeat.
		</p>
	</header>

	<DslBar {store} />

	<section class="tool-grid">
		<OperatorPalette {store} />
		<TreeEditor {store} />
		<aside class="side-panel">
			<ModelPicker {store} />
			<div class="side-tabs">
				<button
					class="tab"
					class:active={store.sideTab === 'library'}
					data-tab="library"
					onclick={() => (store.sideTab = 'library')}
				>
					Library · {store.modelLibrary.length}
				</button>
				<button
					class="tab"
					class:active={store.sideTab === 'results'}
					data-tab="results"
					onclick={() => (store.sideTab = 'results')}
				>
					Example Results
				</button>
				<button
					class="tab"
					class:active={store.sideTab === 'definition'}
					data-tab="definition"
					onclick={() => (store.sideTab = 'definition')}
				>
					Data Model
				</button>
				<button
					class="tab"
					class:active={store.sideTab === 'history'}
					data-tab="history"
					onclick={() => (store.sideTab = 'history')}
				>
					History
				</button>
			</div>
			{#if store.sideTab === 'results'}
				<ResultsPanel {store} />
			{:else if store.sideTab === 'library'}
				<LibraryPanel {store} />
			{:else if store.sideTab === 'definition'}
				<DefinitionPanel {store} />
			{:else}
				<HistoryPanel {store} />
			{/if}
		</aside>
	</section>
</div>

<style>
	.exploration {
		/* Accent palette shared by the child components. */
		--cb-accent: #0ea5e9;
		--cb-error: #e11d48;
		--cb-type-number: #2563eb;
		--cb-type-boolean: #16a34a;
		--cb-type-string: #d97706;
		--cb-type-array: #9333ea;
		--cb-type-objects: #0d9488;

		max-width: 1400px;
		margin: 0 auto;
		padding: 3rem 1.25rem 6rem;
		color: var(--color-text);
		line-height: 1.6;
	}
	.hero {
		text-align: center;
		margin-bottom: 2.5rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		letter-spacing: -0.02em;
		margin: 0 0 1rem;
		color: var(--color-text-strong);
	}
	.subtitle {
		font-size: 1.05rem;
		color: var(--color-text-secondary);
		max-width: 62ch;
		margin: 0 auto;
	}

	.tool-grid {
		display: grid;
		grid-template-columns: 15rem minmax(0, 1fr) 24rem;
		gap: 2rem;
		align-items: start;
	}

	/* Shared building blocks used by all three panels. */
	.exploration :global(.tool-btn) {
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.exploration :global(.tool-btn.active) {
		background: var(--color-filter-active-bg);
		color: var(--color-filter-active-text);
	}
	.exploration :global(.tool-btn:disabled) {
		opacity: 0.4;
		cursor: default;
	}
	.exploration :global(.group-label) {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin-top: 0.9rem;
	}
	.exploration :global(.hint) {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 0 0 0.75rem;
		line-height: 1.4;
	}
	.exploration :global(.type-badge) {
		font-size: 0.62rem;
		font-weight: 600;
		padding: 0.05rem 0.3rem;
		border-radius: 0.25rem;
		border: 1px solid currentColor;
		line-height: 1.3;
	}
	.exploration :global(.type-badge.t-number) {
		color: var(--cb-type-number);
	}
	.exploration :global(.type-badge.t-boolean) {
		color: var(--cb-type-boolean);
	}
	.exploration :global(.type-badge.t-string) {
		color: var(--cb-type-string);
	}
	.exploration :global(.type-badge.t-array) {
		color: var(--cb-type-array);
	}
	.exploration :global(.type-badge.t-objects) {
		color: var(--cb-type-objects);
	}
	.exploration :global(.type-badge.t-scalar),
	.exploration :global(.type-badge.t-any) {
		color: var(--color-text-muted);
	}

	.side-tabs {
		display: flex;
		gap: 1.1rem;
		border-bottom: 1px solid var(--color-border-subtle);
		margin-bottom: 0.85rem;
	}
	.side-tabs .tab {
		border: none;
		background: none;
		font: inherit;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		padding: 0.3rem 0.1rem;
		margin-bottom: -1px;
		border-bottom: 2px solid transparent;
		cursor: pointer;
	}
	.side-tabs .tab:hover {
		color: var(--color-text-strong);
	}
	.side-tabs .tab.active {
		color: var(--color-text-strong);
		font-weight: 600;
		border-bottom-color: var(--cb-accent);
	}

	@media (max-width: 1100px) {
		.tool-grid {
			grid-template-columns: 15rem minmax(0, 1fr);
		}
		.tool-grid > .side-panel {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 768px) {
		.tool-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
