<!--
NOTE (v3): Article.svelte is now the CANONICAL prose source; Shane edits it
directly (his section 1 rewrite lives there, and sections 2-7 were revised in
his voice). This file is kept as the outline/spec archive and is NOT synced
paragraph-for-paragraph anymore.

Anonymization rules (do not violate anywhere in this file or the built page):
- Employer is never named; it is "a large asset manager".
- No internal team, program, or product names.
- Titles are generic: "the executive running the division", "his senior leads".
- The 1940 Act stays (generic US regulation, not employer-identifying).
- All specifics stay at engineering-pattern level.

Figures are built as components: FigIncident (Excel-style comparison sheet),
FigPipelines, FigAst (hover lineage), DemoStage, FigLifecycle, FigCodegen,
FigLenses (real evaluator groupings).
-->

# Same word, different numbers

_A calculation platform built at a large asset manager: the problem that motivated it, the architecture, and a working reconstruction of its core._

## The call

I worked on a pre-trade surveillance engine at a large asset manager. It was the final check before execution: every trade was evaluated against regulatory constraints (many accounts were pension or retirement funds, subject to rules like the 1940 Act), firm-wide limits, and client-specific restrictions. Administrators encoded these as rules over trade and account data, covering liquidity, credit quality, concentration, and anything else computable from the inputs.

The recurring support case looked like this: a portfolio manager or trader calls because the engine has blocked a trade, usually with client money waiting on the outcome. Diagnosis meant pulling data from their system and from ours, walking the rule, then walking the calculation under the rule until the input that tripped the threshold surfaced.

In most of these cases nothing was broken. The desk's system had computed the position as liquid; ours had computed it as illiquid. Both were working as designed. They disagreed about the definition of liquidity.

[FigIncident: Excel-style comparison sheet, divergence surfacing at the rating source row]

## Same word, different numbers

Liquidity was not a single formula. Our definition was built from roughly forty rules, some nested, several dependent on credit ratings. Ratings introduce two independent sources of divergence. Agencies rate the same instrument on different letter scales, so ratings must be _equalized_ onto a common scale before use, and each team had implemented its own equalization. Below that, the ratings themselves could come from different reference databases, with slightly different formats and values.

Each layer was an opportunity for two implementations to diverge. Compounded across forty rules, two systems that both reported "liquidity" produced different numbers, and trades were blocked in the gap between them.

[FigPipelines]

The support load made this worth fixing, and it clearly was not specific to our team. I read other teams' code and talked with their engineers, then with desk heads, portfolio managers, and traders. The same pattern appeared across the division: shared terms, divergent definitions. The consumers of these numbers had a related complaint: a liquidity score of 0.4 was not explainable. There was no way to answer "where does this number come from?" without reading source code.

## Calculations as data

The approach: represent a calculation as data rather than as code inside one team's service. Concretely, as an abstract syntax tree. Leaves are either fields from a shared data model or constants; interior nodes are operations applied to their inputs (arithmetic, comparison, conditional logic, aggregation over lists). The structure is recursive and expresses essentially any calculation we needed.

The value is in what the representation provides. A calculation that is data can be displayed, diffed between versions, and traversed. Because every leaf names a field, lineage is a traversal: "what depends on this field" becomes a query. The same property addresses the support problem: when a number needs justification, the definition and all of its inputs are inspectable.

[FigAst: the equalization calc as a tree, hover lineage]

I called these _derived attributes_ and started with a Java API rather than a UI. The working assumption was that engineers adopt good libraries more readily than mandates: one well-designed way to define calculations over plain objects from a shared data model, with no runtime dependency on any central service. Agreeing on that shared data model took sustained negotiation across teams and was the hardest non-engineering part of the project.

Off-the-shelf rules engines existed and were considered. Two requirements ruled them out: an API we controlled end to end, since the API was the adoption strategy, and full control over evaluation for later performance work. Evaluating a tree was never the difficult part.

I proposed the project to the executive running the division and was given time for a proof of concept, which took about a month, solo. The review that followed was an hour with the division head and his senior leads examining the architecture. The area they pressed hardest was audit: if business users define calculations that gate trades, the definitions need version control, review, and a complete audit trail. That requirement had already surfaced in stakeholder interviews, so the design covered it. The project was approved.

## The demo

Below is a reconstruction of the system's core, built from memory for this write-up: the tree editor, the type system, the definition library, and versioning. The calculations evaluate live against sample records.

A concrete exercise: build the calculation from the previous sections. Use `lookup` to read one agency's letter rating from an instrument's reference data, `switch` to map letters onto numbers, then average across agencies. Alternatively, load "Consensus grade" from the library and inspect it; the expression bar, the tree, and the JSON view are three representations of the same structure.

[DemoStage: embedded, expandable to full viewport]

## Definitions are code

The audit questions from the review were the right ones: these numbers gated trades, so the correctness requirements matched those of production code. From the first version, definitions received the same lifecycle controls as code, designed in before any UI existed:

- Every save created a new **version**; nothing was ever edited in place.
- Versions started as **drafts** and had to be **published** to take effect; consumers never saw work in progress.
- Definitions promoted through environments the way code does, and the approver had to be someone other than the author.
- Calculations carried **test suites**: expected outputs pinned against known inputs, run on every change.
- All of it left an **audit trail**: who saved what, who approved it, who published it, when.

The demo above implements the core of this: append-only versions, drafts, publishing, and a history view. Environment promotion and the separate-approver rule existed in the original system and are described here rather than rebuilt.

The benefit extended beyond compliance. With definitions as versioned data with lineage, changing a field's meaning became a bounded operation: every calculation referencing the field could be enumerated before making the change.

[FigLifecycle]

## The compiler turn

The first evaluator was a recursive interpreter in Java: for each node, either fetch a leaf value or evaluate the children and apply the operator. It was simple and correct, and it was slow: roughly 250 milliseconds to evaluate one derived attribute against one input item. Pre-trade checks evaluate portfolios of thousands of rows, so this did not scale.

The optimizations on my list (constant folding, caching, dead-branch elimination) are standard compiler work, which pointed at a simpler approach: stop interpreting and compile. The evaluator was replaced with code generation. Java source is generated from the AST, compiled in memory inside the running process, loaded through an in-memory classloader, and invoked like any other class. Evaluation time dropped from roughly 250ms to between 2 and 6 milliseconds, with the JVM's JIT providing the optimization work.

Distribution followed the same design. A consuming service pins the ID of a derived attribute, hydrates the compiled class at startup, and refreshes when a new revision is published. Definitions changed infrequently, so polling or refresh-on-restart was sufficient; no pub/sub was required. Teams kept operational independence while definitions remained centralized, versioned, and shared.

[FigCodegen]

## Where it landed

After approval the team grew: four interns over a summer, then eight new analysts for an eight-week build-out, with me as the accountable engineer throughout. Much of what that phase required was not architectural: requirements gathering across teams, working through skepticism with stakeholders, and keeping first-year engineers productive on a system with strict correctness requirements.

Adoption was narrower than the goal. The aim was division-wide unification of calculations; the result was deep adoption within fixed income. Portfolio managers there applied derived attributes to a use case I had not designed for: classification. They defined attributes that bucketed positions by region, market segment, or combinations of both, and analyzed portfolios through those groupings.

[FigLenses]

The main thing I would do differently is organizational. I made the case to engineers, and it worked with engineers; I under-invested in the people who set those engineers' roadmaps. Broad adoption is a prioritization problem before it is an engineering problem. The system remained in production use within fixed income for years after I left the team.

The demo embedded above was reconstructed from memory, years later, without reference material. The reconstruction was straightforward because the design is small: a recursive data structure, a type system over it, and everything else (the editor, lineage, versioning, the expression language) derived from that representation.
