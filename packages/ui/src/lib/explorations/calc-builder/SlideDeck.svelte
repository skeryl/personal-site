<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import CalcBuilder from './CalcBuilder.svelte';
	import FigArchitecture from './FigArchitecture.svelte';
	import FigAst from './FigAst.svelte';
	import FigCodegen from './FigCodegen.svelte';
	import FigIncident from './FigIncident.svelte';
	import FigLenses from './FigLenses.svelte';
	import FigLifecycle from './FigLifecycle.svelte';
	import FigPipelines from './FigPipelines.svelte';

	let { onexit, initial = 0 }: { onexit: () => void; initial?: number } = $props();

	/* Static, self-authored markup; rendered via {@html} so the formatter
	   cannot collapse the pre's line breaks. */
	const javaSnippet = [
		'<span class="kw">import static</span> attributes.<span class="ty">Nodes</span>.data;',
		'',
		'<span class="cm">// engineers declare attributes directly in code</span>',
		'<span class="ty">DerivedAttribute</span>&lt;<span class="ty">Position</span>, <span class="ty">BigDecimal</span>&gt; notional =',
		'    <span class="ty">DerivedAttribute</span>.of(<span class="ty">Position</span>.class, <span class="st">&quot;notional&quot;</span>)',
		'        .mult(data(<span class="ty">Position</span>::price), data(<span class="ty">Position</span>::quantity));',
		'<span class="ty">BigDecimal</span> value = notional.evaluate(position);  <span class="cm">// strong typing in the Java API</span>',
		'',
		'<span class="cm">// UI-authored attributes are fetched by unique ID, injected via app config</span>',
		'<span class="ty">DerivedAttribute</span>&lt;<span class="ty">Position</span>, <span class="ty">BigDecimal</span>&gt; liquidity =',
		'    attributes.fetch(config.get(<span class="st">&quot;surveillance.liquidity-attr-id&quot;</span>));',
		'<span class="ty">BigDecimal</span> score = liquidity.evaluate(position);  <span class="cm">// compiled: 2-6 ms</span>'
	].join('\n');

	const TOTAL = 16;
	const DEMO_SLIDE = 7;
	// svelte-ignore state_referenced_locally -- the prop seeds the state once
	let current = $state(Math.min(TOTAL - 1, Math.max(0, initial)));
	let direction = $state(1);
	let deckEl = $state<HTMLDivElement>();

	const next = () => {
		direction = 1;
		current = Math.min(TOTAL - 1, current + 1);
	};
	const prev = () => {
		direction = -1;
		current = Math.max(0, current - 1);
	};

	/* The slide number rides in the hash so a reload resumes in place. */
	$effect(() => {
		history.replaceState(null, '', `#slides-${current + 1}`);
	});

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
			direction = -1;
			current = 0;
		} else if (e.key === 'End') {
			direction = 1;
			current = TOTAL - 1;
		}
	};

	/* Wheel navigation: a deliberate flick advances one slide, then a short
	   cooldown swallows trackpad inertia. Skipped on the demo slide so the
	   embedded tool keeps its own scrolling. */
	let wheelLockUntil = 0;
	let wheelAcc = 0;
	let wheelReset: ReturnType<typeof setTimeout> | undefined;

	const canScrollFurther = (start: EventTarget | null, dy: number) => {
		let el = start instanceof Element ? start : null;
		while (el && el !== deckEl) {
			if (el instanceof HTMLElement && el.scrollHeight > el.clientHeight + 1) {
				const overflowY = getComputedStyle(el).overflowY;
				if (overflowY === 'auto' || overflowY === 'scroll') {
					if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
					if (dy < 0 && el.scrollTop > 0) return true;
				}
			}
			el = el.parentElement;
		}
		return false;
	};

	const onWheel = (e: WheelEvent) => {
		if (current === DEMO_SLIDE) return;
		if (document.querySelector('[data-slot-menu]')) return;
		if (canScrollFurther(e.target, e.deltaY)) return;
		e.preventDefault();
		const now = performance.now();
		if (now < wheelLockUntil) return;
		wheelAcc += e.deltaY;
		clearTimeout(wheelReset);
		wheelReset = setTimeout(() => (wheelAcc = 0), 200);
		if (Math.abs(wheelAcc) >= 60) {
			const dir = wheelAcc > 0 ? 1 : -1;
			wheelAcc = 0;
			wheelLockUntil = now + 700;
			if (dir > 0) next();
			else prev();
		}
	};

	$effect(() => {
		const el = deckEl;
		if (!el) return;
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});
</script>

<svelte:window onkeydown={onKeydown} />

<div class="deck" data-slide-deck bind:this={deckEl}>
	<div class="stage">
		{#key current}
			<div
				class="slide"
				data-slide={current}
				in:fly={{ y: 42 * direction, duration: 340, easing: cubicOut }}
				out:fly={{ y: -42 * direction, duration: 340, easing: cubicOut }}
			>
				{#if current === 0}
					<div class="center">
						<h1 class="deck-title">Derived Attributes</h1>
						<p class="deck-sub">
							How treating calculations as graphs unified definitions at a large asset manager
						</p>
						<p class="deck-byline">Shane Carroll</p>
					</div>
				{:else if current === 1}
					<span class="kicker">context</span>
					<h2>Background</h2>
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
					<h2>The problem</h2>
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
					<span class="kicker">discovery</span>
					<h2>What the interviews surfaced</h2>
					<p class="needs-lead">
						Weeks with engineers, desk heads, portfolio managers, traders, and compliance. Every
						facet of the design traces to something we heard:
					</p>
					<div class="needs">
						<div class="need">
							<span class="ask">"Why is my trade blocked?"<em>traders</em></span>
							<span class="need-arrow">→</span>
							<span class="answer">
								<strong>Step-through debugger</strong>: pick an instrument, watch any rule evaluate
								node by node
							</span>
						</div>
						<div class="need">
							<span class="ask">"Where does this number come from?"<em>portfolio managers</em></span
							>
							<span class="need-arrow">→</span>
							<span class="answer">
								Definitions as <strong>graphs</strong>: every value explains itself, and
								documentation stays current for free
							</span>
						</div>
						<div class="need">
							<span class="ask"
								>"We each equalize ratings our own way"<em>engineering teams</em></span
							>
							<span class="need-arrow">→</span>
							<span class="answer">
								<strong>One shared data model</strong> and a single definition store, referenced by unique
								ID
							</span>
						</div>
						<div class="need">
							<span class="ask">"Nothing can slow the trade path"<em>desk systems</em></span>
							<span class="need-arrow">→</span>
							<span class="answer">
								Compiled definitions evaluated <strong>in-process</strong>: 2-6 ms per attribute
							</span>
						</div>
						<div class="need">
							<span class="ask">"Who changed this, and who approved it?"<em>compliance</em></span>
							<span class="need-arrow">→</span>
							<span class="answer">
								Immutable versions, approver ≠ author, a complete <strong>audit trail</strong>
							</span>
						</div>
						<div class="need">
							<span class="ask">"We won't give up types and code review"<em>engineers</em></span>
							<span class="need-arrow">→</span>
							<span class="answer">
								A fluent, compile-checked <strong>Java API</strong> over the same ASTs
							</span>
						</div>
					</div>
				{:else if current === 5}
					<span class="kicker">the idea</span>
					<h2>Calculations as graphs!</h2>
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
				{:else if current === 6}
					<span class="kicker">making it real</span>
					<h2>Getting buy-in</h2>
					<ul class="points">
						<li>Pitched the division executive; got one month, solo, for a proof of concept</li>
						<li>Architecture review: division head + senior leads, an hour of probing</li>
						<li>
							Their hardest question was <strong>audit</strong>; the design already answered it
						</li>
						<li>Approved</li>
					</ul>
				{:else if current === 7}
					<div class="demo-head">
						<span class="kicker">live</span>
						<h2>The reconstruction</h2>
					</div>
					<div class="demo-fill"><CalcBuilder /></div>
				{:else if current === 8}
					<span class="kicker">engineers</span>
					<h2>The fluent Java API</h2>
					<div class="code-wrap">
						<pre class="code-block"><code>{@html javaSnippet}</code></pre>
						<p class="code-note">
							The same AST underneath as the UI. data() comes from the Nodes builder and takes a
							method reference (a Function from the base type to a value), so field access is
							compile-checked: a mistyped field is a build failure, not a support call.
						</p>
					</div>
				{:else if current === 9}
					<span class="kicker">architecture</span>
					<h2>The shape of the system</h2>
					<div class="stack">
						<div class="fig-wrap"><FigArchitecture /></div>
					</div>
				{:else if current === 10}
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
				{:else if current === 11}
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
								Codegen: AST → Java source → in-memory compile → classloader → <strong>2-6ms</strong
								>
							</li>
							<li>Consumers pin an attribute ID, hydrate at startup, refresh on publish</li>
						</ul>
						<div class="fig-wrap"><FigCodegen /></div>
					</div>
				{:else if current === 12}
					<span class="kicker">people</span>
					<h2>Team and responsibilities</h2>
					<ul class="points">
						<li>
							Me: problem discovery, architecture, POC, and <strong>accountable engineer</strong> end
							to end
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
				{:else if current === 13}
					<span class="kicker">impact</span>
					<h2>Where it landed</h2>
					<div class="split">
						<ul class="points">
							<li>Deep adoption in fixed income</li>
							<li>
								PMs found an unplanned use case: <strong>classification</strong>; bucketing
								portfolios by region, segment, or both
							</li>
							<li>Traceable definitions addressed the support noise at its source</li>
							<li>In production for years after I moved on</li>
						</ul>
						<div class="fig-wrap shrink"><FigLenses /></div>
					</div>
				{:else if current === 14}
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
	</div>

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
	.stage {
		flex: 1;
		position: relative;
		min-height: 0;
	}
	.slide {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		/* Header and body center together as one block; the title rides just
		   above its content instead of pinning to the top of tall screens. */
		justify-content: center;
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
		list-style: disc;
		padding-left: 1.6rem;
		font-size: clamp(1.05rem, 1.6vw, 1.35rem);
		line-height: 1.55;
		max-width: 46rem;
	}
	.points li {
		margin-bottom: 1rem;
	}
	.points li::marker {
		color: var(--cb-accent);
	}
	.points strong {
		color: var(--color-text-strong);
	}
	.split {
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		gap: 2.5rem;
		align-items: center;
	}
	.stack {
		min-height: 0;
		display: flex;
		flex-direction: column;
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
		container-type: size;
		margin-top: 0.75rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.5rem;
	}
	.code-wrap {
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.75rem;
	}
	.code-block {
		margin: 0;
		max-width: 100%;
		overflow: auto;
		border: 1px solid var(--color-border-subtle);
		border-left: 3px solid var(--cb-accent);
		border-radius: 0.5rem;
		padding: 1.5rem 2.25rem;
		background: var(--color-bg);
		font-family: var(--font-mono, monospace);
		font-size: clamp(0.85rem, 1.5vw, 1.1rem);
		line-height: 1.75;
		color: var(--color-text-secondary);
	}
	.code-block :global(.ty) {
		color: var(--cb-type-number);
	}
	.code-block :global(.st) {
		color: var(--cb-type-string);
	}
	.code-block :global(.kw) {
		color: var(--cb-type-array);
	}
	.code-block :global(.cm) {
		color: var(--color-text-muted);
		font-style: italic;
	}
	.code-note {
		max-width: 40rem;
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: center;
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
	.needs-lead {
		max-width: 56rem;
		margin: 0 0 1.5rem;
		font-size: clamp(0.95rem, 1.4vw, 1.15rem);
		color: var(--color-text-secondary);
	}
	.needs {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		max-width: 64rem;
	}
	.need {
		display: grid;
		grid-template-columns: minmax(0, 5fr) auto minmax(0, 7fr);
		gap: 1.25rem;
		align-items: baseline;
	}
	.ask {
		font-size: clamp(0.95rem, 1.4vw, 1.2rem);
		color: var(--color-text-strong);
	}
	.ask em {
		display: block;
		font-style: normal;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin-top: 0.15rem;
	}
	.need-arrow {
		color: var(--cb-accent);
		font-size: 1.1rem;
	}
	.answer {
		font-size: clamp(0.9rem, 1.3vw, 1.1rem);
		line-height: 1.5;
		color: var(--color-text-secondary);
	}
	.answer strong {
		color: var(--color-text-strong);
	}
</style>
