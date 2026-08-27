<script lang="ts">
	import { typeClass } from './ast';
	import { MODEL_BY_ID } from './datamodels';
	import { printCalc } from './dsl';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();
</script>

<div class="library-panel">
	<p class="hint">
		Calculations stored for {store.model.label}. Click one to load it into the editor, or insert it
		into another calc from the palette or a slot menu.
	</p>
	<div class="rows" data-lib-group="current">
		{#each store.modelLibrary as entry (entry.def.id)}
			<div class="lib-row" data-lib-row={entry.def.id}>
				<button
					class="lib-btn"
					data-calc-load={entry.def.id}
					onclick={() => store.loadCalc(entry.def.id)}
					title="Load into the editor"
				>
					<span class="lib-head">
						<span class="calc-mark">ƒ</span>
						<span class="lib-label">{entry.version.label}</span>
						{#if entry.produces !== null}
							<span class="type-badge t-{typeClass(entry.produces)}">{entry.produces}</span>
						{/if}
						<span class="lib-version">
							v{entry.version.version} · {entry.version.status}
						</span>
						{#if entry.draftPending}
							<span class="lib-pending">draft pending</span>
						{/if}
					</span>
					<span class="lib-desc">{entry.def.description}</span>
					<code class="lib-dsl">{printCalc(entry.version.root)}</code>
				</button>
				{#if !store.isBuiltin(entry.def.id)}
					<button
						class="lib-delete"
						data-calc-delete={entry.def.id}
						onclick={() => store.deleteCalc(entry.def.id)}
						title="Delete from the library"
					>
						×
					</button>
				{/if}
			</div>
		{/each}
	</div>

	{#if store.otherLibrary.length > 0}
		<div class="group-label">Other models</div>
		<div class="rows other" data-lib-group="other">
			{#each store.otherLibrary as entry (entry.def.id)}
				<div class="lib-row" data-lib-row={entry.def.id}>
					<button
						class="lib-btn"
						data-calc-load={entry.def.id}
						onclick={() => store.loadCalc(entry.def.id)}
						title="Load into the editor (switches the data model)"
					>
						<span class="lib-head">
							<span class="calc-mark">ƒ</span>
							<span class="lib-label">{entry.version.label}</span>
							<span class="lib-model">{MODEL_BY_ID[entry.version.modelId].label}</span>
						</span>
					</button>
					{#if !store.isBuiltin(entry.def.id)}
						<button
							class="lib-delete"
							data-calc-delete={entry.def.id}
							onclick={() => store.deleteCalc(entry.def.id)}
							title="Delete from the library"
						>
							×
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.lib-row {
		position: relative;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.375rem;
		transition:
			border-color 0.12s ease,
			background-color 0.12s ease;
	}
	.lib-row:hover {
		border-color: var(--cb-accent);
		background: var(--color-surface-active);
	}
	.lib-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
		width: 100%;
		padding: 0.5rem 0.65rem;
		border: none;
		background: none;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.lib-btn:focus-visible {
		outline: 2px solid var(--cb-accent);
		outline-offset: -2px;
		border-radius: 0.375rem;
	}
	.lib-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		/* Keep the delete affordance clear of long labels. */
		padding-right: 1rem;
	}
	.calc-mark {
		font-style: italic;
		font-weight: 700;
		color: var(--cb-accent);
	}
	.lib-label {
		font-weight: 600;
		font-size: 0.88rem;
		color: var(--color-text-strong);
	}
	.lib-desc {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.lib-dsl {
		font-family: var(--font-mono, monospace);
		font-size: 0.68rem;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}
	.rows.other .lib-btn {
		padding: 0.35rem 0.65rem;
	}
	.rows.other .lib-row {
		opacity: 0.75;
	}
	.rows.other .lib-row:hover {
		opacity: 1;
	}
	.lib-model {
		font-size: 0.68rem;
		color: var(--color-text-muted);
	}
	.lib-version {
		font-size: 0.65rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.lib-pending {
		font-size: 0.62rem;
		color: var(--cb-type-string);
		border: 1px dashed var(--cb-type-string);
		border-radius: 999px;
		padding: 0 0.4rem;
		white-space: nowrap;
	}
	.lib-delete {
		position: absolute;
		top: 0.35rem;
		right: 0.4rem;
		border: none;
		background: none;
		font: inherit;
		padding: 0 0.2rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.lib-delete:hover {
		color: var(--cb-error);
	}
</style>
