<!--
Draft v1 of the calc-builder article. First person (Shane's voice).

Anonymization rules (do not violate anywhere in this file or the built page):
- Employer is never named; it is "a large asset manager".
- No internal team, program, or product names (no division names, no analyst-program jargon).
- Titles are generic: "the executive who ran the division", "his senior leads".
- The 1940 Act stays (generic US regulation, not employer-identifying).
- All specifics stay at engineering-pattern level.

Placeholders:
- [FIGURE n: ...] blocks specify diagrams to build.
- [DEMO] specifies the embedded interactive section.
-->

# Same word, different numbers

_The story of my favorite project: a calculation platform born from an angry phone call, rebuilt here from memory._

## The call

The bad afternoons all started the same way. I'd be at my desk and the phone would ring, and on the other end was someone with a lot of a client's money to move and no patience, because our system had just blocked their trade.

I worked on a trade surveillance engine at a large asset manager: a real-time final check that trades had to pass before execution. The accounts we protected were things like pension funds and retirement funds, and different kinds of accounts carry different regulatory constraints (the 1940 Act, among others), on top of firm-wide rules and client-specific ones. Admins encoded all of that into rules, and our engine evaluated every trade against them: liquidity, credit quality, concentration, really anything you could compute from the trade and the account.

So when the phone rang, the question was always the same: _why won't this trade go through?_ And answering it was miserable. Pull the data on their side. Pull the data on our side. Walk the rule. Walk the calculation under the rule. Find the exact input that tipped the value over the line, while someone waits, angrily, for you to justify a number.

The worst part was what I usually found: nothing was broken. The trading desk's system had computed that the position was liquid enough. Ours had computed that it wasn't. Both systems were working exactly as designed. They just disagreed about what the word "liquidity" meant.

## Same word, different numbers

Liquidity wasn't one formula. It was a calculation with something like forty rules, some nested inside others, and several of them depended on credit ratings. Credit ratings are their own mess: multiple agencies rate the same instrument on slightly different letter scales, so before you can use ratings in a calculation you have to _equalize_ them onto one scale. And it got worse below that: the same rating could come from two different reference databases with slightly different formats and values.

Every one of those layers was a place for two teams to quietly diverge. One team equalized agencies one way; another team did it differently. One system read ratings from one database; another read them from its sibling. Forty rules deep, the drift compounded, and two systems that both said "liquidity" produced two different numbers. Someone's trade got blocked in the gap between them.

[FIGURE 1: "Two pipelines, one word." A compact side-by-side diagram: two stacks
labeled System A and System B, each flowing raw reference data -> its own
equalization -> its own 40-rule liquidity calc -> a number. A: 0.62 "tradeable",
B: 0.48 "blocked". Same instrument at the top of both. Visual language should
match the calc-builder's node cards.]

This became my white whale. Partly because the support noise was drowning us, but mostly because once I saw the shape of the problem I couldn't stop seeing it. I started asking around: reading other teams' code, talking to their engineers (the firm was huge, but the engineering floor is a small world), then to the people who ran desks, to portfolio managers, to traders. Everyone had a version of the same story. Different teams, different definitions, same words. And the people consuming these numbers had a version of it too: a score would say 0.4 and they'd ask "what does that mean? where did it come from?", and nobody could answer without an archaeology project.

## Calculations as data

The idea, when it finally arrived, was almost annoyingly simple: a calculation shouldn't be code buried in some team's service. It should be _data_: a tree.

Model any calculation as an abstract syntax tree. The leaves are either raw fields from a shared data model or constants. Every other node is an operation applied to its inputs: arithmetic, comparisons, conditional logic, aggregations over lists. It's a recursive structure, and it can express essentially any calculation you'd want.

What made this exciting wasn't the tree itself; it's what the representation buys you for free. If a calculation is data, you can display it. You can diff two versions of it. And because every leaf names a field, you get lineage without doing any extra work: ask "what depends on this field?" and the answer is a query, not an archaeology project. That was the answer to the angry phone call: when a number needs justifying, the definition is right there, every input traceable to its source.

[FIGURE 2: "A derived attribute is a tree." The rating-equalization calc drawn
as an AST: an average over per-agency branches, each branch a lookup (rating
where agency = X) feeding a letter-grade-to-number mapping. Rendered in the
same visual language as the demo's node cards, so the reader recognizes it
when they reach the interactive section.]

I called these things _derived attributes_, and I deliberately started with the least glamorous surface: a clean Java API. My theory of adoption was that engineers don't adopt mandates, they adopt pleasant libraries. Give every team one well-designed way to define calculations over plain objects from a shared data model (agreeing on that shared model was its own long negotiation, and probably the hardest non-technical work of the project), with no runtime dependency on my systems, and the definitions come along for free.

People ask why I didn't use an off-the-shelf rules engine; they existed, and I knew them. But nothing did exactly this, and the hard part was never evaluating a tree: it was the clean API that engineers would _want_ to use, and keeping full control of the evaluation so we could make it fast later. A tailored core was worth more than an adapted generic one.

I pitched the executive who ran the division: here's the problem, here's the shape of the fix, give me time to prove it. He did. About a month later, working solo, I had a proof of concept, and then came the meeting I still remember: an office with the division head and all of his senior leads, and an hour of them trying to pull the architecture apart. The question they pressed hardest was the one I'd prepared for most carefully: if business users define calculations that gate trades, those definitions have to be treated like code: versioned, reviewed, auditable, all the way down. We had that answer ready (more on it below). The project got its green light.

## The demo

Years later, the system is still the piece of work I'm proudest of, so I rebuilt its heart from memory: the tree editor, the type system, the library of composable definitions, the versioning. It's below, and it's real: everything computes live against sample records.

If you want the full effect, build the calculation this article is about: use `lookup` to pull one agency's letter rating off an instrument's reference data, `switch` to map letters onto numbers, then average the agencies. Or load "Consensus grade" from the library and inspect it; the expression bar, the tree, and the JSON view are three faces of the same structure.

[DEMO: the calc-builder embedded full-bleed in a bordered stage. A pin/expand
control takes it to the full browser viewport (fixed overlay, article scroll
locked, Escape or a close button to return; zero article bleed while expanded).
Runs the real tool: palette, slot popovers with typeahead, two-way DSL bar,
library with @refs, draft/publish history.]

## Trust, or: definitions are code

The senior leads were right to press on audit, because these numbers gated trades; the correctness bar was as high as it gets. So from the first version, definitions got the full software treatment, and we designed it in before writing the UI:

- Every save created a new **version**; nothing was ever edited in place.
- Versions started as **drafts** and had to be **published** to take effect; consumers never saw work in progress.
- Definitions promoted through environments the way code does, and the approver had to be someone other than the author.
- Calculations carried **test suites**: expected outputs pinned against known inputs, run on every change.
- All of it left an **audit trail**: who saved what, who approved it, who published it, when.

The demo above carries the core of this: append-only versions, drafts, publishing, and a history view. The environment promotion and four-eyes review lived in the real system; I've narrated them here rather than rebuilding the whole approval workflow.

The payoff was bigger than compliance. Once definitions were versioned data with lineage, changing a field's meaning stopped being scary: you could enumerate every calculation that referenced it before you touched anything.

## The compiler turn

The first evaluator was exactly what you'd expect: a recursive walk in Java. Look at a node; if it's a leaf, fetch the value; otherwise evaluate the children and apply the operator. Simple, correct, easy to reason about.

And slow. Something like 250 milliseconds to evaluate one derived attribute against one input item, which is fine right up until you're evaluating portfolios of thousands of rows inside a pre-trade check. I kept a list of optimizations I wanted: constant folding, caching, skipping dead branches. Then it clicked that I was maintaining a to-do list of things compilers already do. I had a tree. Compilers eat trees.

So instead of interpreting the AST, I generated Java source from it, compiled it in memory inside the running process, loaded it through an in-memory classloader, and invoked it like any other class. Evaluation went from ~250ms to somewhere between 2 and 6 milliseconds: two orders of magnitude, essentially for free, courtesy of the JIT and every compiler optimization I no longer had to write myself.

Distribution fell out of the same design. A consuming service pinned the ID of a derived attribute, hydrated the compiled class at startup, and refreshed when a new revision was published (definitions changed rarely, so startup or polling was plenty; no pub/sub required). Teams kept their independence; the definitions stayed centralized, versioned, and shared.

[FIGURE 3: "From definition to machine code." A left-to-right flow: the web
editor and Java API both writing versioned definitions into a central store;
publish events flowing to a codegen box (AST -> generated Java -> in-memory
compile -> classloader); consuming services on the right hydrating by
attribute ID at startup and refreshing on publish. Small callout on the
codegen box: "250ms -> 2-6ms".]

## Where it landed

After the green light the project stopped being just me: a summer with four interns, then an eight-week push with eight analysts fresh out of college, with me still the one name accountable for the whole thing. That stretch taught me as much as the architecture did: gathering requirements across teams, turning skeptics into stakeholders, keeping a crew of brand-new engineers productive on something with a very high correctness bar.

The adoption story is the honest part. I wanted this to unify calculations across the whole division. It didn't get there. Where it landed instead was fixed income, where portfolio managers found a use I hadn't predicted: they used derived attributes to _classify_ positions, bucketing portfolios by region, market segment, or whatever combination they found meaningful, and then read their portfolios through those lenses. The tool I built to stop trades from being wrongly blocked became, in their hands, a way to see.

If I could redo one thing, it's this: I sold the idea to engineers, and engineers loved it. I didn't spend nearly enough time selling it to the people who set those engineers' roadmaps. Broad adoption is not an engineering problem; it's a prioritization problem, and mid-level me was too deep in the joy of the engineering to work the other half. The system was still in use, in its niche, years after I left. I've made peace with the difference between successful and finished.

One more thing. Everything you scrolled past above, the editor, the type gating, the library, the versions, I rebuilt recently from nothing but memory, and it came back almost without effort. I think that's the real evidence for the idea at the center of this story: pick the right representation and everything else follows. I never stopped thinking in trees.
