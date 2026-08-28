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
			The story of my favorite project: a calculation platform born from an angry phone call,
			rebuilt here from memory.
		</p>
	</header>

	<!-- ═══════════════ SECTION 1 · THE CALL · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="the-call" use:reveal>
		<h2>The call</h2>
		<p>
			The bad afternoons all started the same way. I'd be at my desk and the phone would ring, and
			on the other end was someone with a lot of a client's money to move and no patience, because
			our system had just blocked their trade.
		</p>
		<p>
			I worked on a trade surveillance engine at a large asset manager: a real-time final check that
			trades had to pass before execution. The accounts we protected were things like pension funds
			and retirement funds, and different kinds of accounts carry different regulatory constraints
			(the 1940 Act, among others), on top of firm-wide rules and client-specific ones. Admins
			encoded all of that into rules, and our engine evaluated every trade against them: liquidity,
			credit quality, concentration, really anything you could compute from the trade and the
			account.
		</p>
		<p>
			So when the phone rang, the question was always the same: <em
				>why won't this trade go through?</em
			> And answering it was miserable. Pull the data on their side. Pull the data on our side. Walk the
			rule. Walk the calculation under the rule. Find the exact input that tipped the value over the line,
			while someone waits, angrily, for you to justify a number.
		</p>
		<p>
			The worst part was what I usually found: nothing was broken. The trading desk's system had
			computed that the position was liquid enough. Ours had computed that it wasn't. Both systems
			were working exactly as designed. They just disagreed about what the word "liquidity" meant.
		</p>
	</section>

	<!-- FIGURE S1: incident card -->
	<div class="figure-slot" use:reveal><FigIncident /></div>

	<!-- ═══════════════ SECTION 2 · SAME WORD, DIFFERENT NUMBERS · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="divergence" use:reveal>
		<h2>Same word, different numbers</h2>
		<p>
			Liquidity wasn't one formula. It was a calculation with something like forty rules, some
			nested inside others, and several of them depended on credit ratings. Credit ratings are their
			own mess: multiple agencies rate the same instrument on slightly different letter scales, so
			before you can use ratings in a calculation you have to <em>equalize</em> them onto one scale. And
			it got worse below that: the same rating could come from two different reference databases with
			slightly different formats and values.
		</p>
		<p>
			Every one of those layers was a place for two teams to quietly diverge. One team equalized
			agencies one way; another team did it differently. One system read ratings from one database;
			another read them from its sibling. Forty rules deep, the drift compounded, and two systems
			that both said "liquidity" produced two different numbers. Someone's trade got blocked in the
			gap between them.
		</p>
	</section>

	<!-- FIGURE S2: two pipelines, one word -->
	<div class="figure-slot" use:reveal><FigPipelines /></div>

	<section class="prose" data-article-section="divergence-2" use:reveal>
		<p>
			This became my white whale. Partly because the support noise was drowning us, but mostly
			because once I saw the shape of the problem I couldn't stop seeing it. I started asking
			around: reading other teams' code, talking to their engineers (the firm was huge, but the
			engineering floor is a small world), then to the people who ran desks, to portfolio managers,
			to traders. Everyone had a version of the same story. Different teams, different definitions,
			same words. And the people consuming these numbers had a version of it too: a score would say
			0.4 and they'd ask "what does that mean? where did it come from?", and nobody could answer
			without an archaeology project.
		</p>
	</section>

	<!-- ═══════════════ SECTION 3 · CALCULATIONS AS DATA · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="calculations-as-data" use:reveal>
		<h2>Calculations as data</h2>
		<p>
			The idea, when it finally arrived, was almost annoyingly simple: a calculation shouldn't be
			code buried in some team's service. It should be <em>data</em>: a tree.
		</p>
		<p>
			Model any calculation as an abstract syntax tree. The leaves are either raw fields from a
			shared data model or constants. Every other node is an operation applied to its inputs:
			arithmetic, comparisons, conditional logic, aggregations over lists. It's a recursive
			structure, and it can express essentially any calculation you'd want.
		</p>
		<p>
			What made this exciting wasn't the tree itself; it's what the representation buys you for
			free. If a calculation is data, you can display it. You can diff two versions of it. And
			because every leaf names a field, you get lineage without doing any extra work: ask "what
			depends on this field?" and the answer is a query, not an archaeology project. That was the
			answer to the angry phone call: when a number needs justifying, the definition is right there,
			every input traceable to its source.
		</p>
	</section>

	<!-- FIGURE S3: a derived attribute is a tree, hover lineage -->
	<div class="figure-slot wide" use:reveal><FigAst /></div>

	<section class="prose" data-article-section="calculations-as-data-2" use:reveal>
		<p>
			I called these things <em>derived attributes</em>, and I deliberately started with the least
			glamorous surface: a clean Java API. My theory of adoption was that engineers don't adopt
			mandates, they adopt pleasant libraries. Give every team one well-designed way to define
			calculations over plain objects from a shared data model (agreeing on that shared model was
			its own long negotiation, and probably the hardest non-technical work of the project), with no
			runtime dependency on my systems, and the definitions come along for free.
		</p>
		<p>
			People ask why I didn't use an off-the-shelf rules engine; they existed, and I knew them. But
			nothing did exactly this, and the hard part was never evaluating a tree: it was the clean API
			that engineers would <em>want</em> to use, and keeping full control of the evaluation so we could
			make it fast later. A tailored core was worth more than an adapted generic one.
		</p>
		<p>
			I pitched the executive who ran the division: here's the problem, here's the shape of the fix,
			give me time to prove it. He did. About a month later, working solo, I had a proof of concept,
			and then came the meeting I still remember: an office with the division head and all of his
			senior leads, and an hour of them trying to pull the architecture apart. The question they
			pressed hardest was the one I'd prepared for most carefully: if business users define
			calculations that gate trades, those definitions have to be treated like code: versioned,
			reviewed, auditable, all the way down. We had that answer ready (more on it below). The
			project got its green light.
		</p>
	</section>

	<!-- ═══════════════ SECTION 4 · THE DEMO · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="demo-intro" use:reveal>
		<h2>The demo</h2>
		<p>
			Years later, the system is still the piece of work I'm proudest of, so I rebuilt its heart
			from memory: the tree editor, the type system, the library of composable definitions, the
			versioning. It's below, and it's real: everything computes live against sample records.
		</p>
		<p>
			If you want the full effect, build the calculation this article is about: use
			<code>lookup</code> to pull one agency's letter rating off an instrument's reference data,
			<code>switch</code> to map letters onto numbers, then average the agencies. Or load "Consensus grade"
			from the library and inspect it; the expression bar, the tree, and the JSON view are three faces
			of the same structure.
		</p>
	</section>

	<div class="breakout">
		<DemoStage />
	</div>

	<!-- ═══════════════ SECTION 5 · TRUST · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="trust" use:reveal>
		<h2>Trust, or: definitions are code</h2>
		<p>
			The senior leads were right to press on audit, because these numbers gated trades; the
			correctness bar was as high as it gets. So from the first version, definitions got the full
			software treatment, and we designed it in before writing the UI:
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
			The demo above carries the core of this: append-only versions, drafts, publishing, and a
			history view. The environment promotion and four-eyes review lived in the real system; I've
			narrated them here rather than rebuilding the whole approval workflow.
		</p>
		<p>
			The payoff was bigger than compliance. Once definitions were versioned data with lineage,
			changing a field's meaning stopped being scary: you could enumerate every calculation that
			referenced it before you touched anything.
		</p>
	</section>

	<!-- FIGURE S5: lifecycle rail -->
	<div class="figure-slot wide" use:reveal><FigLifecycle /></div>

	<!-- ═══════════════ SECTION 6 · THE COMPILER TURN · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="compiler" use:reveal>
		<h2>The compiler turn</h2>
		<p>
			The first evaluator was exactly what you'd expect: a recursive walk in Java. Look at a node;
			if it's a leaf, fetch the value; otherwise evaluate the children and apply the operator.
			Simple, correct, easy to reason about.
		</p>
		<p>
			And slow. Something like 250 milliseconds to evaluate one derived attribute against one input
			item, which is fine right up until you're evaluating portfolios of thousands of rows inside a
			pre-trade check. I kept a list of optimizations I wanted: constant folding, caching, skipping
			dead branches. Then it clicked that I was maintaining a to-do list of things compilers already
			do. I had a tree. Compilers eat trees.
		</p>
		<p>
			So instead of interpreting the AST, I generated Java source from it, compiled it in memory
			inside the running process, loaded it through an in-memory classloader, and invoked it like
			any other class. Evaluation went from ~250ms to somewhere between 2 and 6 milliseconds: two
			orders of magnitude, essentially for free, courtesy of the JIT and every compiler optimization
			I no longer had to write myself.
		</p>
		<p>
			Distribution fell out of the same design. A consuming service pinned the ID of a derived
			attribute, hydrated the compiled class at startup, and refreshed when a new revision was
			published (definitions changed rarely, so startup or polling was plenty; no pub/sub required).
			Teams kept their independence; the definitions stayed centralized, versioned, and shared.
		</p>
	</section>

	<!-- FIGURE S6: definition-to-machine-code flow + historical timing bars -->
	<div class="figure-slot wide" use:reveal><FigCodegen /></div>

	<!-- ═══════════════ SECTION 7 · WHERE IT LANDED · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="landing" use:reveal>
		<h2>Where it landed</h2>
		<p>
			After the green light the project stopped being just me: a summer with four interns, then an
			eight-week push with eight analysts fresh out of college, with me still the one name
			accountable for the whole thing. That stretch taught me as much as the architecture did:
			gathering requirements across teams, turning skeptics into stakeholders, keeping a crew of
			brand-new engineers productive on something with a very high correctness bar.
		</p>
		<p>
			The adoption story is the honest part. I wanted this to unify calculations across the whole
			division. It didn't get there. Where it landed instead was fixed income, where portfolio
			managers found a use I hadn't predicted: they used derived attributes to
			<em>classify</em> positions, bucketing portfolios by region, market segment, or whatever combination
			they found meaningful, and then read their portfolios through those lenses. The tool I built to
			stop trades from being wrongly blocked became, in their hands, a way to see.
		</p>
	</section>

	<!-- FIGURE S7: three lenses -->
	<div class="figure-slot" use:reveal><FigLenses /></div>

	<section class="prose" data-article-section="landing-2" use:reveal>
		<p>
			If I could redo one thing, it's this: I sold the idea to engineers, and engineers loved it. I
			didn't spend nearly enough time selling it to the people who set those engineers' roadmaps.
			Broad adoption is not an engineering problem; it's a prioritization problem, and mid-level me
			was too deep in the joy of the engineering to work the other half. The system was still in
			use, in its niche, years after I left. I've made peace with the difference between successful
			and finished.
		</p>
		<p>
			One more thing. Everything you scrolled past above, the editor, the type gating, the library,
			the versions, I rebuilt recently from nothing but memory, and it came back almost without
			effort. I think that's the real evidence for the idea at the center of this story: pick the
			right representation and everything else follows. I never stopped thinking in trees.
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
