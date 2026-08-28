<script lang="ts">
	import DemoStage from './DemoStage.svelte';
	import FigAst from './FigAst.svelte';
	import FigCodegen from './FigCodegen.svelte';
	import FigIncident from './FigIncident.svelte';
	import FigLenses from './FigLenses.svelte';
	import FigLifecycle from './FigLifecycle.svelte';
	import FigPipelines from './FigPipelines.svelte';

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
	</header>

	<!-- ═══════════════ SECTION 1 · THE CALL · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="the-call" use:reveal>
		<h2>The call</h2>
		<p>
			I worked on a pre-trade surveillance engine at a large asset manager. It was the final check
			before execution: every trade was evaluated against regulatory constraints (many accounts were
			pension or retirement funds, subject to rules like the 1940 Act), firm-wide limits, and
			client-specific restrictions. Administrators encoded these as rules over trade and account
			data, covering liquidity, credit quality, concentration, and anything else computable from the
			inputs.
		</p>
		<p>
			The recurring support case looked like this: a portfolio manager or trader calls because the
			engine has blocked a trade, usually with client money waiting on the outcome. Diagnosis meant
			pulling data from their system and from ours, walking the rule, then walking the calculation
			under the rule until the input that tripped the threshold surfaced.
		</p>
		<p>
			In most of these cases nothing was broken. The desk's system had computed the position as
			liquid; ours had computed it as illiquid. Both were working as designed. They disagreed about
			the definition of liquidity.
		</p>
	</section>

	<!-- FIGURE S1: incident card -->
	<div class="figure-slot" use:reveal><FigIncident /></div>

	<!-- ═══════════════ SECTION 2 · SAME WORD, DIFFERENT NUMBERS · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="divergence" use:reveal>
		<h2>Same word, different numbers</h2>
		<p>
			Liquidity was not a single formula. Our definition was built from roughly forty rules, some
			nested, several dependent on credit ratings. Ratings introduce two independent sources of
			divergence. Agencies rate the same instrument on different letter scales, so ratings must be
			<em>equalized</em> onto a common scale before use, and each team had implemented its own equalization.
			Below that, the ratings themselves could come from different reference databases, with slightly
			different formats and values.
		</p>
		<p>
			Each layer was an opportunity for two implementations to diverge. Compounded across forty
			rules, two systems that both reported "liquidity" produced different numbers, and trades were
			blocked in the gap between them.
		</p>
	</section>

	<!-- FIGURE S2: two pipelines, one word -->
	<div class="figure-slot" use:reveal><FigPipelines /></div>

	<section class="prose" data-article-section="divergence-2" use:reveal>
		<p>
			The support load made this worth fixing, and it clearly was not specific to our team. I read
			other teams' code and talked with their engineers, then with desk heads, portfolio managers,
			and traders. The same pattern appeared across the division: shared terms, divergent
			definitions. The consumers of these numbers had a related complaint: a liquidity score of 0.4
			was not explainable. There was no way to answer "where does this number come from?" without
			reading source code.
		</p>
	</section>

	<!-- ═══════════════ SECTION 3 · CALCULATIONS AS DATA · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="calculations-as-data" use:reveal>
		<h2>Calculations as data</h2>
		<p>
			The approach: represent a calculation as data rather than as code inside one team's service.
			Concretely, as an abstract syntax tree. Leaves are either fields from a shared data model or
			constants; interior nodes are operations applied to their inputs (arithmetic, comparison,
			conditional logic, aggregation over lists). The structure is recursive and expresses
			essentially any calculation we needed.
		</p>
		<p>
			The value is in what the representation provides. A calculation that is data can be displayed,
			diffed between versions, and traversed. Because every leaf names a field, lineage is a
			traversal: "what depends on this field" becomes a query. The same property addresses the
			support problem: when a number needs justification, the definition and all of its inputs are
			inspectable.
		</p>
	</section>

	<!-- FIGURE S3: a derived attribute is a tree, hover lineage -->
	<div class="figure-slot wide" use:reveal><FigAst /></div>

	<section class="prose" data-article-section="calculations-as-data-2" use:reveal>
		<p>
			I called these <em>derived attributes</em> and started with a Java API rather than a UI. The working
			assumption was that engineers adopt good libraries more readily than mandates: one well-designed
			way to define calculations over plain objects from a shared data model, with no runtime dependency
			on any central service. Agreeing on that shared data model took sustained negotiation across teams
			and was the hardest non-engineering part of the project.
		</p>
		<p>
			Off-the-shelf rules engines existed and were considered. Two requirements ruled them out: an
			API we controlled end to end, since the API was the adoption strategy, and full control over
			evaluation for later performance work. Evaluating a tree was never the difficult part.
		</p>
		<p>
			I proposed the project to the executive running the division and was given time for a proof of
			concept, which took about a month, solo. The review that followed was an hour with the
			division head and his senior leads examining the architecture. The area they pressed hardest
			was audit: if business users define calculations that gate trades, the definitions need
			version control, review, and a complete audit trail. That requirement had already surfaced in
			stakeholder interviews, so the design covered it. The project was approved.
		</p>
	</section>

	<!-- ═══════════════ SECTION 4 · THE DEMO · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="demo-intro" use:reveal>
		<h2>The demo</h2>
		<p>
			Below is a reconstruction of the system's core, built from memory for this write-up: the tree
			editor, the type system, the definition library, and versioning. The calculations evaluate
			live against sample records.
		</p>
		<p>
			A concrete exercise: build the calculation from the previous sections. Use
			<code>lookup</code> to read one agency's letter rating from an instrument's reference data,
			<code>switch</code> to map letters onto numbers, then average across agencies. Alternatively, load
			"Consensus grade" from the library and inspect it; the expression bar, the tree, and the JSON view
			are three representations of the same structure.
		</p>
	</section>

	<div class="breakout">
		<DemoStage />
	</div>

	<!-- ═══════════════ SECTION 5 · TRUST · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="trust" use:reveal>
		<h2>Definitions are code</h2>
		<p>
			The audit questions from the review were the right ones: these numbers gated trades, so the
			correctness requirements matched those of production code. From the first version, definitions
			received the same lifecycle controls as code, designed in before any UI existed:
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
		<p>
			The demo above implements the core of this: append-only versions, drafts, publishing, and a
			history view. Environment promotion and the separate-approver rule existed in the original
			system and are described here rather than rebuilt.
		</p>
		<p>
			The benefit extended beyond compliance. With definitions as versioned data with lineage,
			changing a field's meaning became a bounded operation: every calculation referencing the field
			could be enumerated before making the change.
		</p>
	</section>

	<!-- FIGURE S5: lifecycle rail -->
	<div class="figure-slot wide" use:reveal><FigLifecycle /></div>

	<!-- ═══════════════ SECTION 6 · THE COMPILER TURN · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="compiler" use:reveal>
		<h2>The compiler turn</h2>
		<p>
			The first evaluator was a recursive interpreter in Java: for each node, either fetch a leaf
			value or evaluate the children and apply the operator. It was simple and correct, and it was
			slow: roughly 250 milliseconds to evaluate one derived attribute against one input item.
			Pre-trade checks evaluate portfolios of thousands of rows, so this did not scale.
		</p>
		<p>
			The optimizations on my list (constant folding, caching, dead-branch elimination) are standard
			compiler work, which pointed at a simpler approach: stop interpreting and compile. The
			evaluator was replaced with code generation. Java source is generated from the AST, compiled
			in memory inside the running process, loaded through an in-memory classloader, and invoked
			like any other class. Evaluation time dropped from roughly 250ms to between 2 and 6
			milliseconds, with the JVM's JIT providing the optimization work.
		</p>
		<p>
			Distribution followed the same design. A consuming service pins the ID of a derived attribute,
			hydrates the compiled class at startup, and refreshes when a new revision is published.
			Definitions changed infrequently, so polling or refresh-on-restart was sufficient; no pub/sub
			was required. Teams kept operational independence while definitions remained centralized,
			versioned, and shared.
		</p>
	</section>

	<!-- FIGURE S6: definition-to-machine-code flow + historical timing bars -->
	<div class="figure-slot wide" use:reveal><FigCodegen /></div>

	<!-- ═══════════════ SECTION 7 · WHERE IT LANDED · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="landing" use:reveal>
		<h2>Where it landed</h2>
		<p>
			After approval the team grew: four interns over a summer, then eight new analysts for an
			eight-week build-out, with me as the accountable engineer throughout. Much of what that phase
			required was not architectural: requirements gathering across teams, working through
			skepticism with stakeholders, and keeping first-year engineers productive on a system with
			strict correctness requirements.
		</p>
		<p>
			Adoption was narrower than the goal. The aim was division-wide unification of calculations;
			the result was deep adoption within fixed income. Portfolio managers there applied derived
			attributes to a use case I had not designed for: classification. They defined attributes that
			bucketed positions by region, market segment, or combinations of both, and analyzed portfolios
			through those groupings.
		</p>
	</section>

	<!-- FIGURE S7: three lenses -->
	<div class="figure-slot" use:reveal><FigLenses /></div>

	<section class="prose" data-article-section="landing-2" use:reveal>
		<p>
			The main thing I would do differently is organizational. I made the case to engineers, and it
			worked with engineers; I under-invested in the people who set those engineers' roadmaps. Broad
			adoption is a prioritization problem before it is an engineering problem. The system remained
			in production use within fixed income for years after I left the team.
		</p>
		<p>
			The demo embedded above was reconstructed from memory, years later, without reference
			material. The reconstruction was straightforward because the design is small: a recursive data
			structure, a type system over it, and everything else (the editor, lineage, versioning, the
			expression language) derived from that representation.
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
	.figure-slot.wide {
		max-width: 62rem;
	}
	.breakout {
		margin: 2.5rem 0 3rem;
	}
</style>
