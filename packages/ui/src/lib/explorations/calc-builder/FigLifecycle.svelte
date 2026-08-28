<figure class="fig-lifecycle" data-figure-lifecycle>
	<div class="rail">
		<div class="step">
			<span class="pill draft">draft</span>
			<span class="meta">saved by A · v4</span>
		</div>
		<div class="arrow">
			<span class="arrow-line">→</span>
			<span class="arrow-label">review: approver ≠ author</span>
		</div>
		<div class="step">
			<span class="pill draft">approved</span>
			<span class="meta">by B · tests pass</span>
		</div>
		<div class="arrow">
			<span class="arrow-line">→</span>
			<span class="arrow-label">publish</span>
		</div>
		<div class="step">
			<span class="pill published">published</span>
			<span class="meta">v4 in effect</span>
		</div>
		<div class="arrow">
			<span class="arrow-line">→</span>
			<span class="arrow-label">promote</span>
		</div>
		<div class="step envs">
			<span class="env on">dev</span>
			<span class="env on">uat</span>
			<span class="env">prod</span>
			<span class="meta">environment by environment</span>
		</div>
	</div>
	<figcaption>
		The life of one definition version. Every hop is recorded: who saved it, who approved it, who
		published it, and when. Nothing is ever edited in place.
	</figcaption>
</figure>

<style>
	.fig-lifecycle {
		margin: 0;
	}
	.rail {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
	}
	.pill {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-radius: 999px;
		padding: 0.15rem 0.6rem;
	}
	.pill.draft {
		color: var(--cb-type-string);
		border: 1px dashed var(--cb-type-string);
	}
	.pill.published {
		color: var(--cb-type-boolean);
		border: 1px solid var(--cb-type-boolean);
	}
	.meta {
		font-size: 0.68rem;
		color: var(--color-text-muted);
		font-family: var(--font-mono, monospace);
	}
	.arrow {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		padding-top: 0.05rem;
	}
	.arrow-line {
		color: var(--color-text-muted);
	}
	.arrow-label {
		font-size: 0.62rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.envs {
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
	}
	.env {
		font-size: 0.68rem;
		font-family: var(--font-mono, monospace);
		text-transform: uppercase;
		border: 1px solid var(--color-border-strong);
		border-radius: 0.3rem;
		padding: 0.12rem 0.45rem;
		color: var(--color-text-muted);
	}
	.env.on {
		color: var(--cb-accent);
		border-color: var(--cb-accent);
	}
	.envs .meta {
		width: 100%;
		text-align: center;
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
