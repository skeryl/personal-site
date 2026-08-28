<script lang="ts">
	import { fade } from 'svelte/transition';
	import CalcBuilder from './CalcBuilder.svelte';
	import FigAst from './FigAst.svelte';
	import FigCodegen from './FigCodegen.svelte';
	import FigIncident from './FigIncident.svelte';
	import FigLenses from './FigLenses.svelte';
	import FigLifecycle from './FigLifecycle.svelte';
	import FigPipelines from './FigPipelines.svelte';

	let { onexit }: { onexit: () => void } = $props();

	const TOTAL = 13;
	let current = $state(0);

	const next = () => (current = Math.min(TOTAL - 1, current + 1));
	const prev = () => (current = Math.max(0, current - 1));

	/* The deck owns the viewport while presenting. */
	$effect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	const onKeydown = (e: KeyboardEvent) => {
		const target = e.target;
		if (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement
		) {
			return;
		}
		if (e.key === 'Escape') {
			// A slot popover in the embedded demo gets first claim on Escape.
			if (document.querySelector('[data-slot-menu]')) return;
			onexit();
			return;
		}
		if (e.key === ' ' && target instanceof HTMLButtonElement) return;
		if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
			e.preventDefault();
			next();
		} else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
			e.preventDefault();
			prev();
		} else if (e.key === 'Home') {
			current = 0;
		} else if (e.key === 'End') {
			current = TOTAL - 1;
		}
	};
</script>

<svelte:window onkeydown={onKeydown} />

<div class="deck" data-slide-deck>
	{#key current}
		<div class="slide" data-slide={current} in:fade={{ duration: 150 }}>
			{#if current === 0}
				<div class="center">
					<h1 class="deck-title">Same word, different numbers</h1>
					<p class="deck-sub">A calculation platform for a large asset manager</p>
					<p class="deck-byline">Shane Carroll</p>
				</div>
			{:else if current === 1}
				<span class="kicker">context</span>
				<h2>The setting</h2>
				<ul class="points">
					<li>
						Pre-trade surveillance engine at a large asset manager: <strong
							>the final gate before trade execution</strong
						>
					</li>
					<li>
						Every trade checked against regulatory, firm-wide, and client-specific rules (pension
						and retirement accounts, 1940 Act)
					</li>
					<li>
						Rules defined by administrators over trade + account data: liquidity, credit quality,
						concentration
					</li>
					<li>High correctness bar: a wrong answer blocks real trades</li>
				</ul>
			{:else if current === 2}
				<span class="kicker">the problem</span>
				<h2>The support call</h2>
				<div class="split">
					<ul class="points">
						<li>Recurring case: "why is my trade blocked?"</li>
						<li>Debugging spans two systems' data, rules, and calculations</li>
						<li>Usually <strong>nothing was broken</strong>; both systems working as designed</li>
						<li>They disagreed on the definition of "liquidity"</li>
					</ul>
					<div class="fig-wrap"><FigIncident /></div>
				</div>
			{:else if current === 3}
				<span class="kicker">the problem</span>
				<h2>Why definitions diverge</h2>
				<div class="split">
					<ul class="points">
						<li>"Liquidity" = many dependent calculations over many data points</li>
						<li>Agencies rate on different scales; every team equalizes them differently</li>
						<li>Same rating, different reference databases</li>
						<li>Small divergences compound into <strong>opposite verdicts</strong></li>
						<li>Same pattern across the division: shared terms, divergent definitions</li>
					</ul>
					<div class="fig-wrap"><FigPipelines /></div>
				</div>
			{:else if current === 4}
				<span class="kicker">the idea</span>
				<h2>Calculations as data</h2>
				<div class="split">
					<ul class="points">
						<li>
							Model every calculation as an <strong>abstract syntax tree</strong>: leaves are
							data-model fields or constants; nodes are operations
						</li>
						<li>Displayable, diffable, traversable</li>
						<li>Lineage for free: "what depends on this field?" is a tree traversal</li>
						<li>One shared data model underneath (the hardest negotiation)</li>
					</ul>
					<div class="fig-wrap shrink"><FigAst /></div>
				</div>
			{:else if current === 5}
				<span class="kicker">making it real</span>
				<h2>Getting buy-in</h2>
				<ul class="points">
					<li>Verified the problem across teams: engineers, desk heads, PMs, traders</li>
					<li>Pitched the division executive; got one month, solo, for a proof of concept</li>
					<li>Architecture review: division head + senior leads, an hour of probing</li>
					<li>
						Their hardest question was <strong>audit</strong>; the design already answered it
					</li>
					<li>Approved</li>
				</ul>
			{:else if current === 6}
				<div class="demo-head">
					<span class="kicker">live</span>
					<h2>The reconstruction</h2>
				</div>
				<div class="demo-fill"><CalcBuilder /></div>
			{:else if current === 7}
				<span class="kicker">trust</span>
				<h2>Definitions are code</h2>
				<div class="stack">
					<ul class="points">
						<li>Every save appends an <strong>immutable version</strong>; drafts → published</li>
						<li>Approver must differ from author; promotion through environments</li>
						<li>Test suites pinned to expected outputs, run on every change</li>
						<li>Complete audit trail: who, what, when</li>
					</ul>
					<div class="fig-wrap"><FigLifecycle /></div>
				</div>
			{:else if current === 8}
				<span class="kicker">performance</span>
				<h2>The compiler turn</h2>
				<div class="stack">
					<ul class="points">
						<li>
							v1: recursive interpreter, ~250ms per attribute per row; too slow for portfolios
						</li>
						<li>
							Wanted constant folding, caching, dead branches; that list is
							<strong>compiler work</strong>
						</li>
						<li>
							Codegen: AST → Java source → in-memory compile → classloader → <strong>2-6ms</strong>
						</li>
						<li>Consumers pin an attribute ID, hydrate at startup, refresh on publish</li>
					</ul>
					<div class="fig-wrap"><FigCodegen /></div>
				</div>
			{:else if current === 9}
				<span class="kicker">people</span>
				<h2>Team and responsibilities</h2>
				<ul class="points">
					<li>
						Me: problem discovery, architecture, POC, and <strong>accountable engineer</strong> end to
						end
					</li>
					<li>Senior leadership: sponsorship and design review</li>
					<li>
						Then: four interns for a summer; eight first-year analysts for an 8-week build-out
					</li>
					<li>
						My job shifted: requirements gathering, stakeholder alignment, keeping new engineers
						productive under a strict correctness bar
					</li>
				</ul>
			{:else if current === 10}
				<span class="kicker">impact</span>
				<h2>Where it landed</h2>
				<div class="split">
					<ul class="points">
						<li>Deep adoption in fixed income</li>
						<li>
							PMs found an unplanned use case: <strong>classification</strong>; bucketing portfolios
							by region, segment, or both
						</li>
						<li>Traceable definitions addressed the support noise at its source</li>
						<li>In production for years after I moved on</li>
					</ul>
					<div class="fig-wrap shrink"><FigLenses /></div>
				</div>
			{:else if current === 11}
				<span class="kicker">reflection</span>
				<h2>Tradeoffs and what I'd change</h2>
				<ul class="points">
					<li>
						<strong>Build vs buy</strong>: rejected rules engines; the API was the adoption
						strategy, and we needed control of evaluation
					</li>
					<li>Interpreter first for correctness, compiler later for speed: right order</li>
					<li>Versioning and audit before UI polish: right priority for trading</li>
					<li>
						What I'd change: sell to the people who set roadmaps, not only to engineers; broad
						adoption is a prioritization problem
					</li>
				</ul>
			{:else}
				<div class="center">
					<code class="closing-expr">avg(@moodys-grade, @sp-grade)</code>
					<h2 class="closing">Questions?</h2>
				</div>
			{/if}
		</div>
	{/key}

	<div class="deck-chrome">
		<button class="chrome-btn" data-deck-exit onclick={onexit} title="Back to the article (Esc)">
			✕
		</button>
		<div class="chrome-nav">
			<button class="chrome-btn" data-deck-prev onclick={prev} disabled={current === 0}>←</button>
			<span class="counter" data-deck-counter>{current + 1} / {TOTAL}</span>
			<button class="chrome-btn" data-deck-next onclick={next} disabled={current === TOTAL - 1}>
				→
			</button>
		</div>
	</div>
</div>

<style>
	.deck {
		/* The demo's palette, shared with the figures. */
		--cb-accent: #0ea5e9;
		--cb-error: #e11d48;
		--cb-type-number: #2563eb;
		--cb-type-boolean: #16a34a;
		--cb-type-string: #d97706;
		--cb-type-array: #9333ea;
		--cb-type-objects: #0d9488;

		position: fixed;
		inset: 0;
		z-index: 70;
		background: var(--color-bg);
		color: var(--color-text);
		display: flex;
		flex-direction: column;
	}
	.slide {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 3.5rem 4.5rem 4rem;
		max-width: 90rem;
		width: 100%;
		margin: 0 auto;
	}
	.center {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 0.75rem;
	}
	.deck-title {
		font-size: clamp(2.5rem, 6vw, 4.5rem);
		letter-spacing: -0.02em;
		margin: 0;
		color: var(--color-text-strong);
	}
	.deck-sub {
		font-size: 1.4rem;
		color: var(--color-text-secondary);
		margin: 0;
	}
	.deck-byline {
		font-size: 1rem;
		color: var(--color-text-muted);
		margin-top: 2rem;
	}
	.kicker {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--cb-accent);
	}
	.slide h2 {
		font-size: clamp(1.8rem, 3.5vw, 2.6rem);
		letter-spacing: -0.01em;
		margin: 0.35rem 0 1.75rem;
		color: var(--color-text-strong);
	}
	.points {
		margin: 0;
		padding-left: 1.4rem;
		font-size: clamp(1.05rem, 1.6vw, 1.35rem);
		line-height: 1.55;
		max-width: 46rem;
	}
	.points li {
		margin-bottom: 1rem;
	}
	.points strong {
		color: var(--color-text-strong);
	}
	.split {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		gap: 2.5rem;
		align-items: center;
	}
	.stack {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2.5rem;
	}
	.fig-wrap {
		min-width: 0;
		overflow: auto;
	}
	/* FigAst and FigLenses lay out wider than the split column; zoom keeps
	   them whole instead of clipping the centered overflow. */
	.fig-wrap.shrink {
		zoom: 0.8;
	}
	.slide > .points {
		margin-top: auto;
		margin-bottom: auto;
	}
	.demo-head {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}
	.demo-head h2 {
		margin: 0;
	}
	.demo-fill {
		flex: 1;
		min-height: 0;
		overflow: auto;
		margin-top: 0.75rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.5rem;
	}
	.closing-expr {
		font-family: var(--font-mono, monospace);
		font-size: 1.3rem;
		color: var(--cb-accent);
	}
	.closing {
		font-size: clamp(2rem, 5vw, 3.5rem);
		margin: 0;
		color: var(--color-text-strong);
	}
	.deck-chrome {
		position: absolute;
		bottom: 1rem;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
		pointer-events: none;
	}
	.deck-chrome > * {
		pointer-events: auto;
	}
	.chrome-nav {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.chrome-btn {
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.375rem;
		background: var(--color-bg);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.25rem 0.7rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.chrome-btn:hover:not(:disabled) {
		color: var(--color-text-strong);
		border-color: var(--color-border-strong);
	}
	.chrome-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.counter {
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
	}
	@media (max-width: 900px) {
		.slide {
			padding: 2rem 1.5rem 3.5rem;
		}
		.split {
			grid-template-columns: 1fr;
			overflow: auto;
			align-items: start;
		}
	}
</style>
