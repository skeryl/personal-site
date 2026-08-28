<script lang="ts">
	/* Figure: the rating-equalization calc as a tree, with hover lineage. */
	let lineage = $state(false);

	const AGENCIES = [
		{
			name: 'moodys',
			cases: [
				['"AA"', '19'],
				['"A"', '17']
			]
		},
		{
			name: 'sp',
			cases: [
				['"AA"', '19'],
				['"BBB"', '14']
			]
		}
	];
</script>

<figure class="fig-ast" data-figure-ast>
	<div class="tree">
		<div class="node root" class:lit={lineage}>
			<div class="node-head"><b>avg</b> <span class="muted">Average</span></div>
			<div class="children">
				{#each AGENCIES as agency (agency.name)}
					<div class="node" class:lit={lineage}>
						<div class="node-head"><b>switch</b></div>
						<div class="children">
							<div class="row">
								<span class="kw">on</span>
								<span class="node inline" class:lit={lineage}>
									<b>find</b>
									<span class="muted">rating where agency = "{agency.name}"</span>
									<button
										class="leaf field objects"
										class:source={lineage}
										onmouseenter={() => (lineage = true)}
										onmouseleave={() => (lineage = false)}
										onclick={() => (lineage = !lineage)}
									>
										instrument.creditRatings <span class="badge objects">object[]</span>
									</button>
								</span>
							</div>
							{#each agency.cases as pair (pair[0])}
								<div class="row">
									<span class="kw">when</span>
									<span class="leaf string">{pair[0]}</span>
									<span class="kw">then</span>
									<span class="leaf number">{pair[1]}</span>
								</div>
							{/each}
							<div class="row muted-row">
								<span class="kw">…</span>
								<span class="muted">three more grades, then</span>
								<span class="kw">otherwise</span>
								<span class="leaf number">0</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
	<figcaption>
		One derived attribute: agency ratings equalized onto a shared scale, then averaged. Hover (or
		tap) the reference-data field: everything that depends on it lights up. Lineage is a query, not
		an archaeology project.
	</figcaption>
</figure>

<style>
	.fig-ast {
		margin: 0;
	}
	.tree {
		display: flex;
		justify-content: center;
	}
	.node {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--color-border-subtle);
		border-left: 3px solid var(--cb-type-number);
		border-radius: 0.375rem;
		background: var(--color-bg);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			opacity 0.15s ease;
	}
	.node.inline {
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.5rem;
	}
	.node.lit {
		border-left-color: var(--cb-accent);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--cb-accent) 35%, transparent);
	}
	.node-head b,
	.node.inline b {
		font-weight: 700;
		color: var(--color-text-strong);
	}
	.children {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
		padding-left: 0.75rem;
	}
	.root > .children {
		flex-direction: row;
		align-items: flex-start;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.kw {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
	}
	.leaf {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.1rem 0.4rem;
		border: 1px solid var(--color-border-subtle);
		border-left-width: 3px;
		border-radius: 0.3rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		color: var(--color-text-strong);
		background: none;
	}
	.leaf.string {
		border-left-color: var(--cb-type-string);
	}
	.leaf.number {
		border-left-color: var(--cb-type-number);
	}
	.leaf.field {
		border-left-color: var(--cb-type-objects);
		cursor: pointer;
	}
	.leaf.field.source {
		background: color-mix(in srgb, var(--cb-accent) 12%, transparent);
		border-color: var(--cb-accent);
	}
	.badge {
		font-size: 0.6rem;
		font-weight: 600;
		padding: 0 0.25rem;
		border-radius: 0.25rem;
		border: 1px solid currentColor;
	}
	.badge.objects {
		color: var(--cb-type-objects);
	}
	.muted {
		color: var(--color-text-muted);
		font-size: 0.75rem;
	}
	.muted-row {
		opacity: 0.75;
	}
	figcaption {
		max-width: 42rem;
		margin: 1rem auto 0;
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: center;
	}
	@media (max-width: 720px) {
		.root > .children {
			flex-direction: column;
		}
	}
</style>
