<script lang="ts">
	import { type Post } from '@sc/model';
	import PostComponent from './Post.svelte';

	export let post: Promise<{ default: Post }>;
</script>

{#await post}
	<p>post is loading</p>
{:then postContent}
	<PostComponent post={postContent.default} />
{:catch error}
	<p>Error! {error.message}</p>
{/await}
