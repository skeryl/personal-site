<script lang="ts">
	import SlotMenu from './SlotMenu.svelte';
	import { pathKey, typeClass, type NodePath } from './ast';
	import type { CalcStore } from './state.svelte';
	import { expectedTypeAt } from './typecheck';

	let { store, path }: { store: CalcStore; path: NodePath } = $props();

	const key = $derived(pathKey(path));
	const expected = $derived(expectedTypeAt(store.root, path, store.model, store.library));
	const badge = $derived(typeClass(expected));
</script>

<span class="slot-wrap">
	<button
		class="slot"
		class:selected={store.selectedKey === key}
		class:debug={store.debugKey === key}
		data-slot-path={key}
		onclick={() => store.openMenu(path)}
		title="Click to fill this slot"
	>
		<span class="type-badge t-{badge}">{expected}</span>
	</button>
	{#if store.menuOpen && store.selectedKey === key}
		<SlotMenu {store} />
	{/if}
</span>

<style>
	.slot-wrap {
		position: relative;
		display: inline-flex;
	}
	.slot {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.55rem;
		border: 1.5px dashed var(--color-border-strong);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		cursor: pointer;
	}
	.slot:hover {
		background: var(--color-surface-active);
	}
	.slot.selected {
		border-color: var(--cb-accent);
		border-style: solid;
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-accent) 30%, transparent);
		animation: cb-slot-pulse 0.4s ease-out;
	}
	@keyframes cb-slot-pulse {
		from {
			box-shadow: 0 0 0 7px color-mix(in srgb, var(--cb-accent) 45%, transparent);
		}
		to {
			box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-accent) 30%, transparent);
		}
	}
	.slot.debug {
		border-color: var(--cb-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-accent) 45%, transparent);
	}
</style>
