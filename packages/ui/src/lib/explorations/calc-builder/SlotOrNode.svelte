<script lang="ts">
	import Slot from './Slot.svelte';
	import TreeNode from './TreeNode.svelte';
	import type { CalcNode, NodePath } from './ast';
	import type { CalcStore } from './state.svelte';

	let { store, child, path }: { store: CalcStore; child: CalcNode | null; path: NodePath } =
		$props();
</script>

{#if child === null}
	<Slot {store} {path} />
{:else}
	<TreeNode {store} node={child} {path} />
{/if}
