<script lang="ts">
	import DemoStage from './DemoStage.svelte';
	import FigAst from './FigAst.svelte';
	import FigCodegen from './FigCodegen.svelte';
	import FigIncident from './FigIncident.svelte';
	import FigLenses from './FigLenses.svelte';
	import FigLifecycle from './FigLifecycle.svelte';
	import FigPipelines from './FigPipelines.svelte';

	let { onpresent = undefined }: { onpresent?: () => void } = $props();

	/* Gentle reveal for sections; decorative only, content visible without JS. */
	function reveal(node: HTMLElement) {
		node.style.opacity = '0';
		node.style.transform = 'translateY(16px)';
		node.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					node.style.opacity = '1';
					node.style.transform = 'none';
					observer.unobserve(node);
				}
			},
			{ threshold: 0.1 }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

<article class="article">
	<!-- ═══════════════ HERO · text (edit here) ═══════════════ -->
	<header class="hero">
		<h1>Same word, different numbers</h1>
		<p class="deck">
			A calculation platform built at a large asset manager: the problem that motivated it, the
			architecture, and a working reconstruction of its core.
		</p>
		{#if onpresent}
			<button class="present-btn" data-present onclick={onpresent}>View as slides</button>
		{/if}
	</header>

	<!-- ═══════════════ SECTION 1 · THE CALL · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="the-call" use:reveal>
		<h2>The call</h2>
		<p>
			Once upon a time I had just started working at a large asset management firm on a pre-trade
			surveillance engine.
		</p>
		<p>
			When I started I didn't fully understand the specific, unique level of urgency and stress that
			accompanies being a required step prior to trade execution. At this point in my career I had
			worked in a variety of industries: telecommunications, food technology, healthcare; each with
			their own unique challenges and stakes. This was my first role in the finance industry and my
			first glimpse into what it's like to support a trading system: to tend to it with utmost care
			and hold it to the highest standards of correctness and operational reliability,
			<strong>or else deal with the dreaded support call</strong>.
		</p>
		<h3>The dreaded support call</h3>
		<p>
			Anyone who works in the software business knows them well, and dreads them. You're supporting
			a system that needs to be used by people to do their jobs. When the rubber of software meets
			the road of reality, the treads wear down and eventually burst to reveal a flaw that's been
			waiting to be unearthed. If you're lucky you can catch and prevent this before it becomes a
			widespread issue. If you're unlucky you will receive an angry call from someone. Suddenly your
			system (and by extension, you) is preventing them from doing their time-critical job, from
			executing a timely portfolio rebalance. The firm's reputation (and money) is on the line.
		</p>
		<p>
			So, while the trader breathes down your neck (sometimes literally), you get to work
			diagnosing. Sweatily pulling data from the trading system, and from the surveillance engine,
			and then carefully walking the rules down their various paths and branches, and diving deep
			into the calculations underlying the rule's logic until you find the root cause of the
			discrepancy. It takes time when there's no real time to be given.
		</p>

		<!-- FIGURE S1: incident card -->
		<div class="figure-slot" use:reveal><FigIncident /></div>

		<p>
			It didn't take me long to realize: the fastest path to <strong>living a sane existence</strong
			> while helping to support a global trading operation is to get to the bottom of each incident and
			solve things systematically. What are the patterns arising and how can we ensure we don't have any
			repeat issues?
		</p>
		<p>
			Over my first several months on the job I realized there was a common thread weaving the
			incidents together: it's not that there's a runtime error or an NPE; it's simply that a rule
			has tripped unexpectedly and prevented a trade from executing. Surprisingly, in most of these
			cases <strong>nothing was even broken</strong>. The desk's system had computed the position as
			liquid and ours decided it was illiquid (or similar). Both were "working as designed" and as
			far as these systems knew, they were just reporting their own truth. They simply disagreed
			about the very definition of <span class="strike">reality</span> liquidity itself.
		</p>
		<p>
			One day it dawned on me... what I really needed to do was to convince everyone to simply use
			the same data model and define the same calculations! For everything! It was clearly a problem
			above my pay-grade, but I knew what needed to be done.
		</p>
	</section>

	<!-- ═══════════════ SECTION 2 · SAME WORD, DIFFERENT NUMBERS · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="divergence" use:reveal>
		<h2>Same word, different numbers</h2>
		<p>
			Before I could convince anyone of anything, I needed to understand the disagreement myself.
			Why would two systems, built by two competent teams, disagree about something as fundamental
			as liquidity?
		</p>
		<p>
			Because liquidity wasn't a single formula. Our definition was built from many dependent
			calculations over many data points. Some of these were dependent on credit ratings. And credit
			ratings introduce two subtle sources of divergence on their own. Different <span
				class="tooltip"
				title="e.g. Moody's or S&P">ratings agencies</span
			>
			rate the same instrument on different letter scales, so before you can use ratings in a calculation
			you have to
			<em>equalize</em> them onto one common scale, and each team had (naturally) implemented its own
			equalization. Beneath that sits a quieter problem still: the ratings themselves could be sourced
			from different reference databases, with slightly different formats and values.
		</p>

		<!-- FIGURE S2: two pipelines, one word -->
		<div class="fig-embed" use:reveal><FigPipelines /></div>

		<p>Every layer is another opportunity for two implementations to drift apart!</p>
		<p>
			The more I looked, the more obvious it became that this wasn't specific to our team. I read
			other teams' code and talked with their engineers, then with desk heads, portfolio managers,
			traders. The same pattern was everywhere: <strong>shared terms, divergent definitions</strong
			>. And the people consuming these numbers had their own version of the complaint: a liquidity
			score taken by itself is very abstract. There was no easy answer to "where does this number
			come from?" that didn't involve having an engineer go back to read the source code.
		</p>
		<p>
			To me, the picture of what we needed as a company was solidifying. Wouldn't it be great if we
			had a way to not only unify our calculation definitions, but to also get automatically
			updating documentation "for free" as well?
		</p>
	</section>

	<!-- ═══════════════ SECTION 3 · CALCULATIONS AS DATA · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="calculations-as-data" use:reveal>
		<h2>Calculations as graphs</h2>
		<p>
			The more I thought about it, and began diagramming calculation definitions, the more I
			realized that all of these calculations could be described in a tree structure! After all,
			isn't that how I modeled them in documentation? So I decided to start modeling the
			calculations as graphs.
		</p>
		<p>
			More specifically, I designed a model that allowed me to define each calculation as an
			abstract syntax tree (AST). The leaves are either fields from a shared data model or
			constants; every other node is an operation applied to its inputs: arithmetic, comparisons,
			conditional logic, aggregations over lists. It's a small, recursive structure, and it can
			express essentially any calculation we needed.
		</p>
		<p>
			The tree itself isn't the interesting part. The interesting part is that we were now capable
			of defining a calculation which could not only be evaluated to provide a value, but it could
			also explain to an end-user, step by step, how that value was arrived at. A calculation that
			is a graph can be displayed as easily as calculated. It could give business users the same
			tools as engineers without needing to read the code. And because every leaf names a field,
			answering "what depends on this field?" stops being an archaeology project and becomes a
			query: a simple tree traversal.
		</p>

		<!-- FIGURE S3: a derived attribute is a tree, hover lineage -->
		<div class="fig-embed wide" use:reveal><FigAst /></div>

		<p>
			I called these <em>derived attributes</em>, and I deliberately started with a Java API rather
			than a UI. My working theory of adoption: engineers don't adopt mandates, they adopt good
			libraries. Give every team one well-designed way to define calculations over plain objects
			from a shared data model, with no runtime dependency on any central service, and the
			definitions come along for free. (Agreeing on that shared data model took sustained
			negotiation across teams; easily the hardest non-engineering work of the whole project.)
		</p>
		<p>
			What about off-the-shelf rules engines? They existed, and we evaluated them. Two requirements
			ruled them out. The API <em>was</em> the adoption strategy, so we needed to control it end to end;
			and we wanted full control over evaluation, because I already suspected performance would matter
			later. (It did. More on that soon.)
		</p>
		<h3>The pitch</h3>
		<p>
			I brought the problem and the proposed shape of the solution to the executive running our
			division and asked for time to prove it out. I got it: roughly a month, solo, to build a proof
			of concept. What followed was one of the more memorable meetings of my career: an office with
			the division head and all of his senior leads, and an hour of them probing the architecture
			for weak points. The area they pressed hardest was audit: if business users can define
			calculations that gate trades, those definitions need version control, review, and a complete
			audit trail. That exact requirement had already surfaced in my stakeholder interviews, so the
			design had an answer ready. <strong>The project was approved.</strong>
		</p>
		<p>What we built from there is easier to show than to describe.</p>
	</section>

	<!-- ═══════════════ SECTION 4 · THE DEMO · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="demo-intro" use:reveal>
		<h2>The demo</h2>
		<p>
			Below is a reconstruction of the system's core, built from memory for this write-up: the tree
			editor, the type system, the definition library, versioning. Everything evaluates live against
			sample records; nothing is mocked.
		</p>
		<p>
			If you want the guided tour, try building the very calculation this article is about. Use
			<code>lookup</code> to read one agency's letter rating off an instrument's reference data,
			<code>switch</code> to map letters onto numbers, then average across the agencies. Or load "Consensus
			grade" from the library and inspect it: the expression bar, the tree, and the JSON view are three
			representations of the same underlying structure.
		</p>
	</section>

	<div class="breakout">
		<DemoStage />
	</div>

	<!-- ═══════════════ SECTION 5 · TRUST · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="trust" use:reveal>
		<h2>Definitions are code</h2>
		<p>
			If you found the History tab in the demo, you've already met this section. The senior leads
			pressed on audit for good reason: these numbers gated real trades, so the definitions deserved
			the same rigor as production code. From the very first version, they got it:
		</p>
		<ul>
			<li>Every save created a new <strong>version</strong>; nothing was ever edited in place.</li>
			<li>
				Versions started as <strong>drafts</strong> and had to be <strong>published</strong> to take effect;
				consumers never saw work in progress.
			</li>
			<li>
				Definitions promoted through environments the way code does, and the approver had to be
				someone other than the author.
			</li>
			<li>
				Calculations carried <strong>test suites</strong>: expected outputs pinned against known
				inputs, run on every change.
			</li>
			<li>
				All of it left an <strong>audit trail</strong>: who saved what, who approved it, who
				published it, when.
			</li>
		</ul>
		<!-- FIGURE S5: lifecycle rail -->
		<div class="fig-embed wide" use:reveal><FigLifecycle /></div>

		<p>
			The demo above implements the core of this: append-only versions, drafts, publishing, and a
			history view. Environment promotion and the separate-approver rule existed in the original
			system; I've described them here rather than rebuilding a full approval workflow.
		</p>
		<p>
			The quieter benefit reached beyond compliance. Once definitions were versioned data with
			lineage, changing a field's meaning became a bounded operation: you could enumerate every
			calculation that referenced it <em>before</em> touching anything.
		</p>
		<p>
			Correct and auditable, though, is only half of trustworthy. The other half is being fast
			enough that nobody routes around you.
		</p>
	</section>

	<!-- ═══════════════ SECTION 6 · THE COMPILER TURN · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="compiler" use:reveal>
		<h2>The compiler turn</h2>
		<p>
			The first evaluator was a straightforward recursive interpreter in Java: for each node, either
			fetch a leaf value or evaluate the children and apply the operator. Simple, correct, easy to
			reason about. Also slow: roughly 250 milliseconds to evaluate one derived attribute against
			one input item, and pre-trade checks evaluate portfolios of thousands of rows. The math does
			not work out.
		</p>
		<p>
			I kept a running list of the optimizations I wanted: constant folding, caching, dead-branch
			elimination. At some point I noticed that my list was really a description of standard
			compiler work, which suggested a much simpler path: <strong
				>stop interpreting and compile</strong
			>. Generate Java source from the AST, compile it in memory inside the running process, load it
			through an in-memory classloader, and invoke it like any other class. Evaluation dropped from
			roughly 250ms to between 2 and 6 milliseconds, with the JVM's JIT doing the optimization work
			I had been planning to do by hand.
		</p>

		<!-- FIGURE S6: definition-to-machine-code flow + historical timing bars -->
		<div class="fig-embed wide" use:reveal><FigCodegen /></div>

		<p>
			Distribution fell out of the same design. A consuming service pins the ID of a derived
			attribute, hydrates the compiled class at startup, and refreshes whenever a new revision is
			published. Definitions changed infrequently, so polling (or simply restarting) was plenty; no
			pub/sub required. Teams kept their operational independence; definitions stayed centralized,
			versioned, and shared.
		</p>
		<p>
			Fast, correct, auditable, and shareable. The remaining question was whether anyone would
			actually use it.
		</p>
	</section>

	<!-- ═══════════════ SECTION 7 · WHERE IT LANDED · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="landing" use:reveal>
		<h2>Where it landed</h2>
		<p>
			After the approval, the project stopped being a solo effort: four interns joined for a summer,
			then eight new analysts for an eight-week build-out, with me as the accountable engineer
			throughout. Much of what that phase demanded wasn't architecture at all: gathering
			requirements across teams, converting skeptics into stakeholders, and keeping brand-new
			engineers productive on a system with strict correctness requirements.
		</p>
		<p>
			Adoption was narrower than I'd hoped. The goal was division-wide unification; the result was
			deep adoption within fixed income, where portfolio managers picked it up for a use case I
			never designed: <strong>classification</strong>. They defined attributes that bucketed
			positions by region, market segment, or combinations of both, then analyzed their portfolios
			through those groupings.
		</p>

		<!-- FIGURE S7: three lenses -->
		<div class="fig-embed" use:reveal><FigLenses /></div>

		<p>
			The honest retrospective: I made the case to engineers, and it worked on engineers. I
			under-invested in the people who set those engineers' roadmaps, and broad adoption is a
			prioritization problem before it's an engineering problem. That lesson cost the wider rollout;
			the system itself remained in production use within fixed income for years after I left the
			team.
		</p>
		<p>
			One last observation, about the reconstruction embedded above: I built it from memory, years
			later, without reference material, and it came together quickly. Not because the system was
			simple, but because the design is small: a recursive data structure, a type system over it,
			and everything else (the editor, lineage, versioning, the expression language) derived from
			that one representation.
		</p>
	</section>
</article>

<style>
	.article {
		/* The demo's palette, shared with the figures. */
		--cb-accent: #0ea5e9;
		--cb-error: #e11d48;
		--cb-type-number: #2563eb;
		--cb-type-boolean: #16a34a;
		--cb-type-string: #d97706;
		--cb-type-array: #9333ea;
		--cb-type-objects: #0d9488;

		max-width: 1400px;
		margin: 0 auto;
		padding: 3rem 1.25rem 6rem;
		color: var(--color-text);
	}
	.hero {
		max-width: 46rem;
		margin: 0 auto 3.5rem;
		text-align: center;
	}
	.hero h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		letter-spacing: -0.02em;
		line-height: 1.15;
		margin: 0 0 1rem;
		color: var(--color-text-strong);
	}
	.deck {
		font-size: 1.15rem;
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0 auto;
		max-width: 40rem;
	}
	.present-btn {
		margin-top: 1.5rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 999px;
		background: var(--color-bg);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.35rem 1rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.present-btn:hover {
		color: var(--color-text-strong);
		border-color: var(--color-border-strong);
	}
	.prose {
		max-width: 42rem;
		margin: 0 auto 2rem;
		font-size: 1.05rem;
		line-height: 1.75;
	}
	.prose h2 {
		font-size: 1.6rem;
		letter-spacing: -0.01em;
		margin: 3rem 0 1rem;
		color: var(--color-text-strong);
	}
	.prose h3 {
		font-size: 1.15rem;
		letter-spacing: -0.01em;
		margin: 2rem 0 0.75rem;
		color: var(--color-text-strong);
	}
	.prose .strike {
		text-decoration: line-through;
		color: var(--color-text-muted);
	}
	.prose .tooltip {
		text-decoration: underline dotted;
		text-underline-offset: 0.15em;
		cursor: help;
	}
	/* Figures woven into prose break out of the text measure. Centering is
	 * margin-based because the reveal action animates inline transforms. */
	.prose .fig-embed {
		width: min(52rem, calc(100vw - 2.5rem));
		margin: 2.25rem 0 2.5rem calc(50% - min(26rem, (100vw - 2.5rem) / 2));
	}
	.prose .fig-embed.wide {
		width: min(62rem, calc(100vw - 2.5rem));
		margin-left: calc(50% - min(31rem, (100vw - 2.5rem) / 2));
	}
	.prose p {
		margin: 0 0 1.25rem;
	}
	.prose ul {
		margin: 0 0 1.25rem;
		padding-left: 1.4rem;
	}
	.prose li {
		margin-bottom: 0.5rem;
	}
	.prose strong {
		color: var(--color-text-strong);
	}
	.prose code {
		font-family: var(--font-mono, monospace);
		font-size: 0.9em;
		background: var(--color-surface);
		padding: 0.1em 0.35em;
		border-radius: 0.25rem;
	}
	.figure-slot {
		max-width: 52rem;
		margin: 0 auto 2.5rem;
	}
	.breakout {
		margin: 2.5rem 0 3rem;
	}
</style>
