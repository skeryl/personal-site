<figure class="fig-arch" data-figure-arch>
	<div class="lane">
		<div class="box accent">
			<b>Definition UI</b>
			<span>admins · draft, test, publish</span>
		</div>
		<div class="box accent">
			<b>Fluent Java API</b>
			<span>engineers · the same definitions, in code</span>
		</div>
	</div>
	<div class="arrow">↓ <em>save drafts · publish versions</em></div>
	<div class="lane">
		<div class="box strong">
			<b>Attribute Service</b>
			<span>versioning · approver ≠ author · audit trail</span>
		</div>
		<span class="link">⇄</span>
		<div class="box store">
			<b>Versioned store</b>
			<span>immutable versions · drafts → published</span>
		</div>
	</div>
	<div class="arrow">↓ <em>fetch published definitions by ID · refresh on publish</em></div>
	<div class="host">
		<span class="host-label">a consuming process, e.g. the surveillance engine</span>
		<div class="box lib">
			<b>Client library</b>
			<span>hydrate at startup · codegen → bytecode · cache</span>
		</div>
		<div class="arrow">↓ <em>evaluate(position) · in-process · ~6 ms</em></div>
		<div class="box app">
			<b>Application code</b>
			<span>rules, checks, classification (no network hop per row)</span>
		</div>
	</div>
	<figcaption>
		One authoring plane, one system of record, and evaluation embedded in each consumer: apps pin an
		attribute ID and never re-implement the definition.
	</figcaption>
</figure>

<style>
	.fig-arch {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}
	.lane {
		display: flex;
		align-items: stretch;
		justify-content: center;
		gap: 0.9rem;
	}
	.box {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		border: 1px solid var(--color-border-subtle);
		border-left: 3px solid var(--color-border-strong);
		border-radius: 0.375rem;
		padding: 0.5rem 0.9rem;
		background: var(--color-bg);
		text-align: center;
		min-width: 15rem;
	}
	.box b {
		font-size: 0.92rem;
		color: var(--color-text-strong);
	}
	.box span {
		font-size: 0.76rem;
		color: var(--color-text-secondary);
	}
	.box.accent {
		border-left-color: var(--cb-accent);
	}
	.box.strong {
		border-left-color: var(--color-text-strong);
	}
	.box.store {
		border-left-color: var(--cb-type-objects);
	}
	.box.lib {
		border-left-color: var(--cb-type-array);
	}
	.box.app {
		border-left-color: var(--cb-type-boolean);
	}
	.link {
		align-self: center;
		color: var(--color-text-muted);
		font-size: 1.1rem;
	}
	.arrow {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		padding: 0.1rem 0;
	}
	.arrow em {
		font-style: normal;
		font-size: 0.74rem;
	}
	.host {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		border: 1px dashed var(--color-border-strong);
		border-radius: 0.5rem;
		padding: 0.9rem 1.4rem 1rem;
		margin-top: 0.15rem;
	}
	.host-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
	}
	figcaption {
		max-width: 42rem;
		margin: 0.9rem auto 0;
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: center;
	}
	@media (max-width: 720px) {
		.lane {
			flex-direction: column;
			align-items: center;
		}
		.box {
			min-width: 13rem;
		}
	}
</style>
