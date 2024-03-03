<script lang="ts">
	import type { PostSummary } from '@sc/model';
	import Tags from '$lib/components/Tags.svelte';
	import allPosts from '$lib/entries';
	import PostVideoPreview from '$lib/components/PostVideoPreview.svelte';

	export let limit: number | undefined = undefined;

	function sortPosts(a: PostSummary, b: PostSummary): number {
		return -1 * Math.sign(a.timestamp.getTime() - b.timestamp.getTime());
	}

	const posts: PostSummary[] = Object.values(allPosts)
		.map((p) => p.summary)
		.filter((post) => !post.isHidden)
		.sort(sortPosts)
		.filter((p, ix) => !(limit != undefined && ix >= limit));

	let hoveredPost: PostSummary | undefined;

	function onPostHover(post: PostSummary) {
		hoveredPost = post;
	}
</script>

<PostVideoPreview selectedPost={hoveredPost}></PostVideoPreview>

<div class="flex flex-wrap gap-4">
	{#each posts as post}
		<a
			href={`/journal/${post.id}`}
			class="flex transition-shadow my-4 shadow hover:shadow-lg p-4 flex-1 max-w-[420px] min-w-[300px] min-h-[120px] rounded-lg bg-surface-secondary opacity-70 hover:opacity-90"
			on:mouseenter={() => onPostHover(post)}
		>
			<div class="flex flex-col flex-1">
				<div class="flex justify-between">
					<h3 class="flex flex-1 basis-9/12">{post.title}</h3>
					<div class="flex flex-1 text-sm place-self-end self-start text-right justify-end">
						<span class="timestamp">
							{new Date(post.timestamp).toLocaleDateString()}
						</span>
					</div>
				</div>
				<div class="flex flex-wrap h-full flex-1">
					<Tags tags={post.tags ?? []} />
				</div>
			</div>
		</a>
	{/each}
</div>
