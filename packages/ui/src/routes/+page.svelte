<script>
	export const ssr = false;
	import { onDestroy } from 'svelte';
	import { fullbleed } from '$lib/state/layout';
	import PostList from '$lib/components/PostList.svelte';

	fullbleed.set(true);
	onDestroy(() => fullbleed.set(false));
</script>

<PostList />
