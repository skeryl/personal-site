<script lang="ts">
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();

	const definition = $derived({
		id: store.loadedId,
		label: store.calcName || 'Untitled calc',
		modelId: store.modelId,
		root: store.root
	});
	const json = $derived(JSON.stringify(definition, null, 2));
</script>

<div class="definition-panel">
	<p class="hint">
		The stored shape of this calculation. The tree, the expression bar, and this JSON are three
		views of the same definition.
	</p>
	<pre class="def-json" data-definition-json><code>{json}</code></pre>
</div>

<style>
	.def-json {
		margin: 0;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.375rem;
		background: var(--color-surface-active);
		font-family: var(--font-mono, monospace);
		font-size: 0.72rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
		overflow: auto;
		max-height: 32rem;
	}
</style>
