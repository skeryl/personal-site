<figure class="fig-codegen" data-figure-codegen>
	<div class="flow">
		<div class="col">
			<div class="box">web editor</div>
			<div class="box">Java API</div>
		</div>
		<div class="arrow">→</div>
		<div class="col">
			<div class="box store">
				versioned store
				<span class="pills"><span class="pill">v1</span><span class="pill on">v2</span></span>
			</div>
		</div>
		<div class="arrow labeled"><span>→</span><small>on publish</small></div>
		<div class="col">
			<div class="box gen">
				<div class="gen-title">codegen</div>
				<div class="gen-steps">AST → Java source → in-memory compile → classloader</div>
			</div>
		</div>
		<div class="arrow">→</div>
		<div class="col">
			<div class="box small">consumer · pins attribute ID</div>
			<div class="box small">hydrates at startup</div>
			<div class="box small">refreshes on publish</div>
		</div>
	</div>
	<div class="bars">
		<div class="bar-row">
			<span class="bar-label">interpreted</span>
			<div class="bar slow"><span>~200 ms</span></div>
		</div>
		<div class="bar-row">
			<span class="bar-label">compiled</span>
			<div class="bar fast"></div>
			<span class="bar-value">~6 ms</span>
		</div>
	</div>
	<figcaption>
		From definition to machine code. The bars are approximate timings from the original Java system:
		one computed attribute, one input item, drawn to scale.
	</figcaption>
</figure>

<style>
	.fig-codegen {
		margin: 0;
	}
	.flow {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		flex-wrap: wrap;
	}
	.col {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.box {
		border: 1px solid var(--color-border-subtle);
		border-left: 3px solid var(--color-border-strong);
		border-radius: 0.375rem;
		padding: 0.4rem 0.6rem;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		background: var(--color-bg);
		text-align: center;
	}
	.box.store {
		border-left-color: var(--cb-type-string);
	}
	.box.gen {
		border-left-color: var(--cb-accent);
		max-width: 13rem;
	}
	.box.small {
		font-size: 0.72rem;
	}
	.gen-title {
		font-weight: 700;
		color: var(--color-text-strong);
	}
	.gen-steps {
		font-family: var(--font-mono, monospace);
		font-size: 0.66rem;
		color: var(--color-text-muted);
		margin-top: 0.2rem;
	}
	.pills {
		display: inline-flex;
		gap: 0.25rem;
		margin-left: 0.35rem;
	}
	.pill {
		font-size: 0.62rem;
		font-family: var(--font-mono, monospace);
		border: 1px dashed var(--cb-type-string);
		color: var(--cb-type-string);
		border-radius: 999px;
		padding: 0 0.35rem;
	}
	.pill.on {
		border-style: solid;
		border-color: var(--cb-type-boolean);
		color: var(--cb-type-boolean);
	}
	.arrow {
		color: var(--color-text-muted);
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.arrow.labeled small {
		font-size: 0.6rem;
		color: var(--color-text-muted);
	}
	.bars {
		max-width: 34rem;
		margin: 1.5rem auto 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.bar-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.bar-label {
		font-size: 0.72rem;
		font-family: var(--font-mono, monospace);
		color: var(--color-text-muted);
		min-width: 5.5rem;
		text-align: right;
	}
	.bar {
		height: 1.15rem;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
	}
	.bar.slow {
		flex: 1;
		background: color-mix(in srgb, var(--cb-error) 22%, transparent);
		border: 1px solid color-mix(in srgb, var(--cb-error) 45%, transparent);
		padding-left: 0.5rem;
	}
	.bar.slow span {
		font-size: 0.7rem;
		font-family: var(--font-mono, monospace);
		color: var(--color-text-strong);
	}
	.bar.fast {
		width: 3%;
		min-width: 4px;
		background: var(--cb-type-boolean);
	}
	.bar-value {
		font-size: 0.7rem;
		font-family: var(--font-mono, monospace);
		color: var(--color-text-strong);
	}
	figcaption {
		max-width: 42rem;
		margin: 1rem auto 0;
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
