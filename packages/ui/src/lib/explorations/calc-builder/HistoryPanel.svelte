<script lang="ts">
	import { printCalc } from './dsl';
	import { effectiveVersion } from './library';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();

	const def = $derived(store.loadedCalc);
	const effective = $derived(def === null ? null : effectiveVersion(def));
	/** Newest first: the audit trail reads top-down. */
	const trail = $derived(def === null ? [] : [...def.versions].reverse());

	const fmtTime = (stamp: number): string =>
		new Date(stamp).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
</script>

<div class="history-panel">
	{#if def === null}
		<p class="hint">Load a calculation to see its version history.</p>
	{:else}
		<p class="hint">
			Every save appends a draft version; publishing pins what other calcs resolve to. Open an old
			version to restore it (saving afterwards appends, never rewrites).
		</p>
		<div class="versions">
			{#each trail as entry (entry.version)}
				<div
					class="version-row"
					class:effective={effective !== null && entry.version === effective.version}
					data-version-row={entry.version}
				>
					<div class="version-main">
						<div class="version-head">
							<span class="version-number">v{entry.version}</span>
							<span class="status {entry.status}">{entry.status}</span>
							{#if effective !== null && entry.version === effective.version}
								<span class="effective-tag">in effect</span>
							{/if}
						</div>
						<div class="version-meta">
							saved {fmtTime(entry.savedAt)}
							{#if entry.publishedAt !== undefined}
								· published {fmtTime(entry.publishedAt)}
							{/if}
						</div>
						<code class="version-dsl">{printCalc(entry.root)}</code>
					</div>
					<div class="version-actions">
						<button
							class="tool-btn"
							data-version-open={entry.version}
							onclick={() => store.loadVersion(def.id, entry.version)}
						>
							Open
						</button>
						{#if entry.status === 'draft'}
							<button
								class="tool-btn"
								data-version-publish={entry.version}
								onclick={() => store.publishVersion(def.id, entry.version)}
							>
								Publish
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.versions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.version-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.6rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.375rem;
		padding: 0.5rem 0.65rem;
	}
	.version-row.effective {
		border-color: var(--cb-accent);
	}
	.version-main {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}
	.version-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.version-number {
		font-weight: 700;
		font-size: 0.85rem;
		color: var(--color-text-strong);
	}
	.status {
		font-size: 0.62rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-radius: 999px;
		padding: 0 0.4rem;
	}
	.status.draft {
		color: var(--cb-type-string);
		border: 1px dashed var(--cb-type-string);
	}
	.status.published {
		color: var(--cb-type-boolean);
		border: 1px solid var(--cb-type-boolean);
	}
	.effective-tag {
		font-size: 0.62rem;
		color: var(--cb-accent);
	}
	.version-meta {
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}
	.version-dsl {
		font-family: var(--font-mono, monospace);
		font-size: 0.68rem;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 16rem;
	}
	.version-actions {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.3rem;
		flex-shrink: 0;
	}
</style>
