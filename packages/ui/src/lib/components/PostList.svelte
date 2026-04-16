<script lang="ts">
	import { PostType, type PostSummary } from '@sc/model';
	import allPosts from '$lib/entries';
	import videos from '$lib/assets/videos/posts/index.js';

	const ALLOWED_POSTS = new Set(['lava-territories', 'blob-convergence', 'blob-grid']);

	function sortPosts(a: PostSummary, b: PostSummary): number {
		return -1 * Math.sign(a.timestamp.getTime() - b.timestamp.getTime());
	}

	const posts: PostSummary[] = Object.values(allPosts)
		.map((p) => p.summary)
		.filter((post) => !post.isHidden && ALLOWED_POSTS.has(post.id))
		.sort(sortPosts);
</script>

<div class="feed">
	{#each posts as post}
		<a href={`/journal/${post.id}`} class="post-item">
			{#if videos[post.id]}
				<video autoplay loop muted playsinline class="post-video">
					<source src={videos[post.id]} />
				</video>
			{:else}
				<div class="post-placeholder"></div>
			{/if}
			<span class="post-title">{post.title}</span>
		</a>
	{/each}
</div>

<style>
	.feed {
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 639px) {
		.feed {
			height: 100dvh;
			overflow-y: scroll;
			scroll-snap-type: y mandatory;
		}
	}

	.post-item {
		display: block;
		width: 100%;
		height: 100dvh;
		overflow: hidden;
		position: relative;
		text-decoration: none;
	}

	@media (max-width: 639px) {
		.post-item {
			height: 100dvh;
			scroll-snap-align: start;
			flex-shrink: 0;
		}
	}

	.post-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.post-placeholder {
		width: 100%;
		height: 100%;
		background: var(--color-surface-active);
	}

	.post-title {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-family: 'DM Sans', sans-serif;
		font-size: 1.155rem;
		font-weight: 400;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #fd52ca;
		mix-blend-mode: multiply;
		white-space: nowrap;
		pointer-events: none;
	}
</style>
