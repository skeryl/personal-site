<script>
	export const ssr = false;
	import { onMount, onDestroy } from 'svelte';
	import { fullbleed } from '$lib/state/layout';
	import PostList from '$lib/components/PostList.svelte';

	// Set synchronously so first-paint is correct on direct loads.
	fullbleed.set(true);
	// Re-assert in onMount so we win the race against the previous
	// page's onDestroy (which fires AFTER the new page's script body).
	onMount(() => fullbleed.set(true));
	onDestroy(() => fullbleed.set(false));
</script>

<PostList />
