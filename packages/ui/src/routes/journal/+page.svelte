<script lang="ts">
	import type { PostSummary } from '@sc/model';
	import Tags from '$lib/components/Tags.svelte';
	import allPosts from '$lib/entries';
	import { base } from '$app/paths';

	function sortPosts(a: PostSummary, b: PostSummary): number {
		return -1 * Math.sign(a.timestamp.getTime() - b.timestamp.getTime());
	}

	const posts: PostSummary[] = Object.values(allPosts)
		.map((p) => p.summary)
		.filter((post) => !post.isHidden)
		.sort(sortPosts);
</script>

<div class="header">
	<h1>journal</h1>

	<p>here are some ideas I've been jotting down.</p>

	<p>these aren't fully refined, but some of them are fun to play with.</p>
</div>

<div class="posts-container">
	{#each posts as post}
		<a href={`${base}/journal/${post.id}`}>
			<div class="post-header">
				<div class="post-title">
					<div>
						<h2>{post.title}</h2>
						<span>published</span>
						<span class="timestamp">
							{new Date(post.timestamp).toLocaleDateString()}
						</span>
					</div>
					<div>
						<Tags tags={post.tags ?? []} />
					</div>
				</div>
			</div>
		</a>
	{/each}
</div>
