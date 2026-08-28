<script lang="ts">
	/* Figure: two systems compute "liquidity" for the same instrument. */
	const SYSTEMS = [
		{
			name: 'The trading desk',
			db: 'ratings from reference DB-1',
			eq: 'equalization, their way',
			value: '0.62',
			verdict: 'liquid · proceed',
			ok: true
		},
		{
			name: 'Trade surveillance',
			db: 'ratings from reference DB-2',
			eq: 'equalization, our way',
			value: '0.48',
			verdict: 'illiquid · blocked',
			ok: false
		}
	];
</script>

<figure class="fig-pipelines" data-figure-pipelines>
	<div class="instrument">
		<span class="chip">one instrument</span>
	</div>
	<div class="pipes">
		{#each SYSTEMS as system (system.name)}
			<div class="pipe">
				<div class="pipe-name">{system.name}</div>
				<div class="stage drift">{system.db}</div>
				<div class="stage drift">{system.eq}</div>
				<div class="stage">"liquidity" · 40 nested rules</div>
				<div class="result" class:blocked={!system.ok}>
					<span class="value">{system.value}</span>
					<span class="verdict">{system.verdict}</span>
				</div>
			</div>
		{/each}
	</div>
	<figcaption>
		The same instrument evaluated by two systems. The tinted stages are where the implementations
		diverge; across forty rules the differences compound into opposite outcomes, with both systems
		working as designed.
	</figcaption>
</figure>

<style>
	.fig-pipelines {
		margin: 0;
	}
	.instrument {
		display: flex;
		justify-content: center;
		margin-bottom: 0.75rem;
	}
	.chip {
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 999px;
		color: var(--color-text-strong);
	}
	.pipes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		max-width: 44rem;
		margin: 0 auto;
	}
	.pipe {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}
	.pipe-name {
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-text-muted);
		text-align: center;
		margin-bottom: 0.15rem;
	}
	.stage {
		border: 1px solid var(--color-border-subtle);
		border-left: 3px solid var(--color-border-strong);
		border-radius: 0.375rem;
		padding: 0.45rem 0.6rem;
		font-size: 0.82rem;
		color: var(--color-text-secondary);
		background: var(--color-bg);
		text-align: center;
	}
	.stage.drift {
		border-left-color: var(--cb-type-string);
		background: color-mix(in srgb, var(--cb-type-string) 7%, transparent);
		color: var(--color-text-strong);
	}
	.result {
		border: 1px solid var(--color-border-subtle);
		border-left: 3px solid var(--cb-type-boolean);
		border-radius: 0.375rem;
		padding: 0.5rem 0.6rem;
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.6rem;
		background: var(--color-bg);
	}
	.result.blocked {
		border-left-color: var(--cb-error);
	}
	.value {
		font-family: var(--font-mono, monospace);
		font-weight: 700;
		font-size: 1.05rem;
		color: var(--color-text-strong);
	}
	.verdict {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--cb-type-boolean);
	}
	.result.blocked .verdict {
		color: var(--cb-error);
	}
	figcaption {
		max-width: 42rem;
		margin: 1rem auto 0;
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: center;
	}
	@media (max-width: 640px) {
		.pipes {
			grid-template-columns: 1fr;
		}
	}
</style>
