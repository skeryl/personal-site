/*
 * The Java API examples, shared by the slide deck and the article.
 * Static, self-authored markup rendered via {@html} because the svelte-4
 * prettier parser collapses literal line breaks inside <pre>.
 */

/** An attribute declared in code: typed field refs, direct evaluation. */
export const JAVA_DECLARED = [
	'<span class="kw">import static</span> attributes.<span class="ty">Inputs</span>.field;',
	'',
	'<span class="cm">// engineers declare attributes directly in code</span>',
	'<span class="ty">ComputedAttribute</span>&lt;<span class="ty">Position</span>, <span class="ty">BigDecimal</span>&gt; notional =',
	'    <span class="ty">ComputedAttribute</span>.of(<span class="ty">Position</span>.class, <span class="st">&quot;notional&quot;</span>)',
	'        .mult(field(<span class="ty">Position</span>::price), field(<span class="ty">Position</span>::quantity));',
	'',
	'<span class="ty">BigDecimal</span> value = notional.evaluate(position);  <span class="cm">// strong typing in the Java API</span>'
].join('\n');

/** A UI-authored attribute: fetched by unique ID from application config. */
export const JAVA_FETCHED = [
	'<span class="cm">// UI-authored attributes are fetched by unique ID, injected via app config</span>',
	'<span class="ty">ComputedAttribute</span>&lt;<span class="ty">Position</span>, <span class="ty">BigDecimal</span>&gt; liquidity =',
	'    attributes.fetch(config.get(<span class="st">&quot;surveillance.liquidity-attr-id&quot;</span>));',
	'',
	'<span class="ty">BigDecimal</span> score = liquidity.evaluate(position);'
].join('\n');
