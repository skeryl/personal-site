<script lang="ts">
	import { type Post } from '@sc/model';
	import PostComponent from './Post.svelte';

	interface Props {
		post: Promise<{ default: Post }>;
	}

	let { post }: Props = $props();
</script>

{#await post}
	<p>post is loading</p>
{:then postContent}
	<PostComponent post={postContent.default} />
{:catch error}
	<p>Error! {error.message}</p>
{/await}
