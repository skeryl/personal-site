<figure class="fig-incident" data-figure-incident>
	<div class="card">
		<div class="card-head">support call · blocked trade</div>
		<div class="line">
			<span class="check">✓</span> pull the desk's data <span class="ok">ok</span>
		</div>
		<div class="line"><span class="check">✓</span> pull our data <span class="ok">ok</span></div>
		<div class="line"><span class="check">✓</span> walk the rule <span class="ok">ok</span></div>
		<div class="line">
			<span class="check">✓</span> walk the calculation <span class="ok">ok</span>
		</div>
		<div class="divider"></div>
		<div class="line result">
			<span class="who">desk</span> liquidity = 0.62 <span class="ok">proceed</span>
		</div>
		<div class="line result">
			<span class="who">ours</span> liquidity = 0.48 <span class="bad">blocked</span>
		</div>
		<div class="divider"></div>
		<div class="line footer">status: working as designed. both of them.</div>
	</div>
</figure>

<style>
	.fig-incident {
		margin: 0;
		display: flex;
		justify-content: center;
	}
	.card {
		font-family: var(--font-mono, monospace);
		font-size: 0.8rem;
		line-height: 1.9;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.5rem;
		padding: 0.9rem 1.2rem;
		background: var(--color-bg);
		color: var(--color-text-secondary);
		min-width: min(26rem, 100%);
	}
	.card-head {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin-bottom: 0.4rem;
	}
	.line {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
	}
	.check {
		color: var(--cb-type-boolean);
	}
	.ok {
		margin-left: auto;
		color: var(--cb-type-boolean);
	}
	.bad {
		margin-left: auto;
		color: var(--cb-error);
		font-weight: 700;
	}
	.who {
		color: var(--color-text-muted);
		min-width: 3.2rem;
	}
	.result {
		color: var(--color-text-strong);
	}
	.divider {
		border-top: 1px dashed var(--color-border-subtle);
		margin: 0.45rem 0;
	}
	.footer {
		color: var(--color-text-muted);
		font-style: italic;
	}
</style>
