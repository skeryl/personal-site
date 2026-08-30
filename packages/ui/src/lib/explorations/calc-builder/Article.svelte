<script lang="ts">
	import DemoStage from './DemoStage.svelte';
	import FigAst from './FigAst.svelte';
	import FigCodegen from './FigCodegen.svelte';
	import FigIncident from './FigIncident.svelte';
	import FigLenses from './FigLenses.svelte';
	import FigLifecycle from './FigLifecycle.svelte';
	import FigPipelines from './FigPipelines.svelte';

	let { onpresent = undefined }: { onpresent?: () => void } = $props();

	/* Number the footnotes: a superscript marker lands at each anchor and the
	   matching number is stamped onto the margin note, with no markup burden
	   when writing new notes. */
	function numberFootnotes(node: HTMLElement) {
		const refs: HTMLElement[] = [];
		node.querySelectorAll('.footnote').forEach((note, index) => {
			const n = String(index + 1);
			const ref = document.createElement('sup');
			ref.className = 'fn-ref';
			ref.textContent = n;
			note.before(ref);
			note.setAttribute('data-fn', n);
			refs.push(ref);
			// The note itself renders at the end of its paragraph, so the
			// narrow-screen inline fallback cannot split a sentence.
			note.closest('p')?.append(note);
		});
		return { destroy: () => refs.forEach((ref) => ref.remove()) };
	}

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

<article class="article" use:numberFootnotes>
	<!-- ═══════════════ HERO · text (edit here) ═══════════════ -->
	<header class="hero">
		<h1>Computed Attributes</h1>
		<p class="deck">What I learned (and built) when I</p>
		{#if onpresent}
			<button class="present-btn" data-present onclick={onpresent}>View as slides</button>
		{/if}
	</header>

	<!-- ═══════════════ SECTION 1 · THE CALL · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="the-call" use:reveal>
		<h2>Randomness</h2>
		<p>
			One of the things I like best about being a software engineer is that I get to embed myself
			deeply into other industries. I believe you have to have empathy for the users of your
			software; that you have to put yourself into the mindset of the people making the industry
			work. Sometimes the specific industry you work in is a choice, or a calling, but often it's as
			random as a recruiter reaching out on LinkedIn asking if you've ever thought about moving to
			New York City. This randomness is what inspired the move I made in 2015 and launched me into
			the next phase of my career. I didn't know it at the time, but I would spend the next 11 years
			(so far) in the finance industry.
		</p>
		<p>
			At this point in my career I had worked in a variety of industries: telecommunications, food
			technology, healthcare; each with their own unique challenges, joys<span class="footnote"
				>my favorite joy of the food industry was visiting the Dunkin Brands headquarters in Canton,
				MA and sampling their experimental ice cream and doughnut flavors 🤤</span
			>, and stakes. My first role in the finance industry turned out to be working on an investment
			guidelines surveillance engine. To translate for my non-finance friends: we were the final
			guardrail protecting our customers and the firm from a "bad trade" (a trade that may violate
			one of the myriad rules governing portfolio balances, restricted securities, or any other
			criteria our operations users entered into the system). It was an eye-opening shift in the
			standards of correctness and operational reliability required to keep things going well.
			Because when things stopped going well, that's when I'd get
			<strong>the much-dreaded support call</strong>.
		</p>
		<h3>The much-dreaded support call</h3>
		<p>
			Anyone who works in the software business knows them well. We were supporting a system that
			people relied on to do their jobs. When the rubber of software meets the road of reality, the
			treads wear down and eventually burst to reveal a flaw that's been waiting to be unearthed. If
			we were lucky, we caught the flaw before it became a widespread issue. If we were unlucky, I'd
			receive an angry call from someone. Suddenly our system (and by extension, me) was preventing
			them from doing their time-critical job, from executing a timely portfolio rebalance. The
			firm's reputation (and money) was on the line.
		</p>
		<p>
			So, with the trader breathing down my neck (sometimes literally), I got to work diagnosing.
			Sweatily pulling data from the trading system, and from the surveillance engine, and then
			carefully walking the rules down their various paths and branches, and diving deep into the
			calculations underlying the rule's logic until I found the root cause of the discrepancy. It
			took time when there was no real time to be given.
		</p>

		<!-- FIGURE S1: incident card -->
		<div class="figure-slot" use:reveal><FigIncident /></div>

		<p>
			Each call ended the same way: trade unblocked, caller placated, root cause still in place. A
			system that has the power to prevent trades owes its users a defensible answer every time,
			whether or not anyone calls to complain. So I decided to treat the incidents as data rather
			than interruptions: what patterns kept appearing, and how could we prevent the whole class of
			problem instead of the individual complaint? (That this also promised a saner on-call
			existence was a happy bonus.)
		</p>
		<p>
			Over my first several months on the job I realized there was a common thread weaving the
			incidents together: it's not that there's a runtime error or an NPE; it's simply that a rule
			has tripped unexpectedly and prevented a trade from executing. Surprisingly, in most of these
			cases <strong>nothing was even "broken"</strong><span class="footnote"
				>in the traditional, "oh no! this code has a bug", sense of the word</span
			>. The desk's system had computed the position as liquid and ours decided it was illiquid (or
			similar). Both were "working as designed" and as far as these systems knew, they were just
			reporting their own truth. They simply disagreed about the very definition of
			<span class="strike">reality</span> liquidity itself. Confusing? Yes.
		</p>
	</section>

	<!-- ═══════════════ SECTION 2 · SAME WORD, DIFFERENT NUMBERS · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="divergence" use:reveal>
		<h2>Disagreeing about reality</h2>
		<p>
			This is one of those moments where a problem shifts from one class of problem to something
			else entirely. Why would two systems, built by two competent teams, disagree about something
			as fundamental as liquidity<span class="footnote"
				>Liquidity is the concept of how easy it is to buy or sell something for cash. Cash is the
				most liquid because... it's cash! Most publicly traded stock is fairly liquid and you
				wouldn't struggle to find a buyer/seller under normal circumstances (for the right price).
				Other assets behave differently and since there are regulations that require certain ratios
				of a portfolio being "liquid" these definitions matter.</span
			>?
		</p>
		<p>
			The problem was that liquidity wasn't a single formula. Our definition was actually built from
			several dependent calculations over many data points. Some of these were dependent on credit
			ratings. And credit ratings introduce two subtle sources of divergence on their own. Different
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard users can reach the gloss) -->
			<span class="tooltip" tabindex="0" data-tip="e.g. Moody's or S&P">ratings agencies</span>
			rate the same instrument on different letter scales, so before we could use ratings in a calculation
			we had to
			<em>normalize</em> them onto one common scale, and each team had (naturally) implemented its own
			normalization calculation. Not to mention that the ratings data itself could be sourced from different
			reference databases, with slightly different formats and values.
		</p>

		<!-- FIGURE S2: two pipelines, one word -->
		<div class="fig-embed" use:reveal><FigPipelines /></div>

		<p>Every layer is another opportunity for two implementations to drift apart!</p>

		<p>
			This is when I started to realize that what I really needed to do was to convince everyone to
			use the same data model and define calculations the same way! For everything! Definitely
			easier said than done; it was clearly a problem above my pay-grade, but I knew what needed to
			be done so I began to ask around.
		</p>
		<p>
			I read other teams' code and talked with their engineers, then with desk heads, portfolio
			managers, traders. The same pattern was everywhere: <strong
				>shared terms, but divergent definitions</strong
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
			As I began reflecting on the problem and diagramming calculation definitions, I realized that
			all of these calculations could be described in a tree structure! After all, isn't that how I
			modeled them in documentation? So, I decided to start modeling the calculations as graphs.
		</p>
		<p>
			More specifically, I designed a model that allowed me to define each calculation as an
			abstract syntax tree (AST). The leaves are either fields from a shared data model or
			constants; every other node is an operation applied to its inputs: arithmetic, comparisons,
			conditional logic, aggregations over lists. It's a small, recursive structure, and it can
			express essentially any calculation we needed.
		</p>
		<p>
			The built-in "side-effect" of modeling calculations this way is that it could not only be
			evaluated to provide a value, but it could also explain to an end user, step by step, how that
			value was arrived at. A calculation that is a graph can be displayed as easily as calculated.
			It could give business users the same tools as engineers without needing to read the code. And
			because every leaf names a field, answering "what depends on this field?" stops being an
			archaeology project and becomes a query: a simple tree traversal. Then I realized that we
			could even take this a step further and have the business users, the experts on these
			calculation definitions, define the calcs themselves in a UI! But first, I needed to prove the
			basics.
		</p>

		<!-- FIGURE S3: a computed attribute is a tree, hover lineage -->
		<div class="fig-embed wide" use:reveal><FigAst /></div>

		<p>
			Let's call these <em>computed attributes</em>. I deliberately started with a Java API. Our
			theory of adoption: engineers don't adopt mandates; they adopt good libraries. Give every team
			one well-designed way to define calculations over plain objects from a shared data model, with
			no runtime dependency on any central service, and the definitions come along for free.<span
				class="footnote"
				>Agreeing on that shared data model took sustained negotiation across teams and wasn't fully
				realized in my time there; easily the hardest non-engineering work of the whole project.</span
			>
		</p>
		<p>
			What about off-the-shelf rules engines? They existed, and we evaluated them. Two requirements
			ruled them out. The API <em>was</em> the adoption strategy, so we needed to control it end to
			end; and we wanted full control over evaluation, because I already suspected performance would
			matter later.<span class="footnote">foreshadowing</span> Not to mention, Drools was the biggest
			library in this space (and still kind of is). Once I had the nice API, I didn't want to spend time
			code-generating Drools DSL.
		</p>
		<h3>The pitch</h3>
		<p>
			With the help of my mentors, I brought the problem and the proposed shape of the solution to
			the executive running our division and asked for time to prove it out. To my surprise, he said
			yes! They gave me roughly a month, solo, to build a proof of concept. That's when I got to
			work on discovery, API design, discussions, and testing.
		</p>
		<p>
			Presenting this POC to the executive and his senior leadership team became one of the more
			memorable meetings of my career: we all gathered around a conference room table where the
			senior-most technology group in our company spent an hour grilling me about the problem and
			the proposed solution, looking for architectural issues or any risk at all that this project
			might pose. One area they pressed me on particularly was audit: if business users can define
			calculations that gate trades, those definitions need version control, review, and a complete
			audit trail. That exact requirement had already surfaced in my stakeholder interviews, so the
			design had an answer ready. <strong>The project was approved.</strong>
		</p>
		<p>What we ended up building may be easier to show than to describe.</p>
	</section>

	<!-- ═══════════════ SECTION 4 · THE DEMO · text (edit here) ═══════════════ -->
	<section class="prose" data-article-section="demo-intro" use:reveal>
		<h2>What we built</h2>
		<p>
			Below is a reconstruction of the system's core, built from memory for this write-up: the tree
			editor, the type system, the definition library, versioning. Everything evaluates live against
			sample records.
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
			lineage, changing a field's meaning became a bounded operation: we could enumerate every
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
			reason about. Also slow: roughly 200 milliseconds to evaluate one computed attribute against
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
			roughly 200ms to roughly 10 milliseconds, with the JVM's JIT doing the optimization work I had
			been planning to do by hand.
		</p>

		<!-- FIGURE S6: definition-to-machine-code flow + historical timing bars -->
		<div class="fig-embed wide" use:reveal><FigCodegen /></div>

		<p>
			Distribution fell out of the same design. A consuming service pins the ID of a computed
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
	<!-- ═══════════════ COLOPHON · text (edit here) ═══════════════ -->
	<footer class="prose colophon" data-article-section="colophon">
		<p>
			Everything here is a from-memory reconstruction written well after the fact. Names, numbers,
			and code are approximations or inventions of my own; the demo and its data were fabricated for
			this article. No proprietary code or information appears here.
		</p>
	</footer>
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
	.colophon {
		margin-top: 3.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--color-border-subtle);
		font-size: 0.85rem;
		color: var(--color-text-muted);
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
	/* Sidenotes: floated into the right margin when there is room for one,
	   otherwise a small bordered aside inside the column. */
	.prose .footnote {
		float: right;
		clear: right;
		width: 15rem;
		margin-right: -18rem;
		margin-top: 0.35rem;
		margin-bottom: 0.5rem;
		font-size: 0.78rem;
		line-height: 1.55;
		font-style: italic;
		color: var(--color-text-muted);
	}
	.prose .footnote::before {
		content: attr(data-fn) '. ';
		font-style: normal;
		font-weight: 600;
		color: var(--cb-accent);
	}
	.prose :global(.fn-ref) {
		font-size: 0.7em;
		line-height: 0;
		font-weight: 600;
		color: var(--cb-accent);
	}
	@media (max-width: 1280px) {
		.prose .footnote {
			float: none;
			display: block;
			width: auto;
			margin: 0.75rem 0;
			padding-left: 0.75rem;
			border-left: 2px solid var(--color-border-subtle);
		}
	}
	.prose .strike {
		text-decoration: line-through;
		color: var(--color-text-muted);
	}
	.prose .tooltip {
		position: relative;
		text-decoration: underline dotted;
		text-underline-offset: 0.15em;
		cursor: help;
		outline: none;
	}
	.prose .tooltip::after {
		content: attr(data-tip);
		position: absolute;
		left: 50%;
		bottom: calc(100% + 0.5em);
		transform: translateX(-50%) translateY(3px);
		white-space: nowrap;
		background: var(--color-text-strong);
		color: var(--color-bg);
		font-size: 0.78rem;
		line-height: 1.3;
		padding: 0.3rem 0.6rem;
		border-radius: 0.375rem;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.12s ease,
			transform 0.12s ease;
		z-index: 5;
	}
	.prose .tooltip::before {
		content: '';
		position: absolute;
		left: 50%;
		bottom: calc(100% + 0.5em - 4px);
		transform: translateX(-50%) translateY(3px);
		border: 4px solid transparent;
		border-top-color: var(--color-text-strong);
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.12s ease,
			transform 0.12s ease;
		z-index: 5;
	}
	.prose .tooltip:hover::after,
	.prose .tooltip:focus-visible::after,
	.prose .tooltip:hover::before,
	.prose .tooltip:focus-visible::before {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
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
