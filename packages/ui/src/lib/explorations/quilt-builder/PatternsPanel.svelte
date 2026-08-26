<script lang="ts">
	import { COLS, ROWS } from './data';
	import { CUT_DIMS, KIND_LAYOUT, KIND_NOUN, THUMB_SCALE } from './cutting';
	import { rotatedSlots, toPolygonPoints } from './geometry';
	import type { QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const VB = 100;
	const THUMB_W = COLS * THUMB_SCALE;
	const THUMB_H = ROWS * THUMB_SCALE;

	const plural = (count: number, noun: string): string => (count === 1 ? noun : `${noun}s`);
</script>

<aside class="patterns-panel">
	<div class="patterns-head">
		<h3>Patterns</h3>
		<div class="patterns-head-actions">
			<button class="tool-btn" onclick={() => store.newPattern()}>New</button>
			<button
				class="tool-btn"
				onclick={() => store.savePattern()}
				disabled={!store.patternName.trim()}
			>
				{store.currentId !== null ? 'Update' : 'Save'}
			</button>
		</div>
	</div>

	{#if store.patternCards.length > 1}
		<input
			class="pattern-filter"
			type="text"
			placeholder="Filter patterns"
			aria-label="Filter patterns"
			bind:value={store.patternFilter}
		/>
	{/if}

	{#if store.filteredPatterns.length > 0}
		<ul class="pattern-list">
			{#each store.filteredPatterns as card (card.id)}
				<li>
					<button
						class="pattern-load"
						class:current={card.id === store.currentId}
						onclick={() => store.loadPattern(card.id)}
						title="Load {card.name}"
					>
						<div class="pattern-thumb-col">
							<svg
								class="pattern-thumb"
								viewBox="0 0 {THUMB_W} {THUMB_H}"
								style="aspect-ratio: {COLS} / {ROWS}"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								<rect width={THUMB_W} height={THUMB_H} fill="#ffffff" />
								{#each card.polys as poly, i (i)}
									<polygon points={poly.points} fill={poly.fill} />
								{/each}
							</svg>
							<span class="pattern-name">{card.name}</span>
						</div>
						<div class="pattern-spec">
							{#each card.spec as group (group.fabric.id)}
								<div class="spec-group">
									<div class="spec-head">
										<span class="chip" style="background: {group.fabric.hex}"></span>
										<span class="spec-title">
											{group.fabric.name} ({group.totalSquares}
											{plural(group.totalSquares, 'square')})
										</span>
									</div>
									<ul class="spec-rows">
										{#each group.rows as row (row.kind)}
											<li>
												<svg viewBox="0 0 {VB} {VB}" class="spec-icon" aria-hidden="true">
													{#each rotatedSlots(KIND_LAYOUT[row.kind], row.kind === 'rect' ? 1 : 0) as slot, i (i)}
														<polygon
															points={toPolygonPoints(slot.points, VB)}
															fill={i === 0 ? 'var(--color-text-secondary)' : '#ffffff'}
															stroke="var(--color-text-secondary)"
															stroke-width="6"
														/>
													{/each}
												</svg>
												<span>
													{row.count}
													{plural(row.count, KIND_NOUN[row.kind])}: {CUT_DIMS[row.kind]}
												</span>
											</li>
										{/each}
									</ul>
								</div>
							{/each}
						</div>
					</button>
					<button
						class="pattern-delete"
						onclick={() => store.deletePattern(card.id)}
						aria-label={`Delete ${card.name}`}
					>
						×
					</button>
				</li>
			{/each}
		</ul>
	{:else if store.patternCards.length === 0}
		<p class="hint">Nothing saved yet. Patterns are stored in this browser.</p>
	{:else}
		<p class="hint">No patterns match.</p>
	{/if}
</aside>

<style>
	.patterns-panel h3 {
		font-size: 1.1rem;
		margin: 0;
		color: var(--color-text-heading);
	}
	.patterns-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.6rem;
	}
	.patterns-head-actions {
		display: flex;
		gap: 0.4rem;
	}
	.pattern-filter {
		width: 100%;
		box-sizing: border-box;
		padding: 0.3rem 0.5rem;
		margin-bottom: 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.8rem;
		color: inherit;
	}
	.pattern-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.pattern-list li {
		position: relative;
	}
	.pattern-load {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		width: 100%;
		padding: 0.45rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.8rem;
		text-align: left;
		cursor: pointer;
	}
	.pattern-load:hover,
	.pattern-load.current {
		background: var(--color-surface-active);
		border-color: var(--color-border-strong);
	}
	.pattern-thumb-col {
		width: 6.5rem;
		flex-shrink: 0;
	}
	.pattern-thumb {
		display: block;
		width: 100%;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.25rem;
		background: #ffffff;
	}
	.pattern-name {
		display: block;
		margin-top: 0.3rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pattern-spec {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.spec-head {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding-bottom: 0.25rem;
		border-bottom: 2px solid var(--color-text-strong);
		margin-bottom: 0.3rem;
	}
	.spec-head .chip {
		width: 1.1rem;
		height: 1.1rem;
	}
	.spec-title {
		font-weight: 700;
		font-size: 0.82rem;
		color: var(--color-text-strong);
	}
	.spec-rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}
	.spec-rows li {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	.spec-icon {
		width: 1.05rem;
		height: 1.05rem;
		flex-shrink: 0;
	}
	.pattern-delete {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		border: none;
		background: rgba(255, 255, 255, 0.85);
		font: inherit;
		font-size: 0.9rem;
		line-height: 1;
		padding: 0.25rem 0.5rem;
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: 0.25rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}
	.pattern-delete:hover {
		background: #ffffff;
		color: #b91c1c;
	}
</style>
