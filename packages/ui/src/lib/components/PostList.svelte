<script lang="ts">
	import { PostType, type PostSummary } from '@sc/model';
	import Tags from '$lib/components/Tags.svelte';
	import allPosts from '$lib/entries';
	import PostVideoPreview from '$lib/components/PostVideoPreview.svelte';

	export let limit: number | undefined = undefined;

	function sortPosts(a: PostSummary, b: PostSummary): number {
		return -1 * Math.sign(a.timestamp.getTime() - b.timestamp.getTime());
	}

	const allPostSummaries: PostSummary[] = Object.values(allPosts)
		.map((p) => p.summary)
		.filter((post) => !post.isHidden)
		.sort(sortPosts)
		.filter((_, ix) => !(limit != undefined && ix >= limit));

	// Type filter
	const typeLabels: Record<string, string> = {
		[PostType.exploration]: 'Explorations',
		[PostType.experiment]: 'Experiments',
		[PostType.experiment3d]: '3D Experiments'
	};
	let activeType: string | null = null;

	// Tag filter
	let activeTags: Set<string> = new Set();

	function toggleType(type: string) {
		activeType = activeType === type ? null : type;
	}

	function toggleTag(tag: string) {
		const next = new Set(activeTags);
		if (next.has(tag)) {
			next.delete(tag);
		} else {
			next.add(tag);
		}
		activeTags = next;
	}

	function clearFilters() {
		activeType = null;
		activeTags = new Set();
	}

	// Collect all unique tags
	$: allTags = [...new Set(allPostSummaries.flatMap((p) => p.tags))].sort();

	// Collect unique types
	$: allTypes = [...new Set(allPostSummaries.map((p) => p.type))];

	// Filtered posts
	$: filteredPosts = allPostSummaries.filter((post) => {
		if (activeType && post.type !== activeType) return false;
		if (activeTags.size > 0 && !post.tags.some((t) => activeTags.has(t))) return false;
		return true;
	});

	$: hasFilters = activeType !== null || activeTags.size > 0;

	let hoveredPost: PostSummary | undefined;
	$: isAnyHovered = hoveredPost !== undefined;
</script>

<PostVideoPreview selectedPost={hoveredPost} />

<!-- Filter bar -->
<div class="mb-6">
	<div class="flex flex-wrap items-center gap-2 mb-3">
		{#each allTypes as type}
			<button
				class="px-3 py-1 text-sm font-medium rounded-md transition-colors no-underline"
				class:bg-neutral-800={activeType === type}
				class:text-white={activeType === type}
				class:bg-neutral-100={activeType !== type}
				class:text-neutral-600={activeType !== type}
				class:hover:bg-neutral-200={activeType !== type}
				on:click={() => toggleType(type)}
			>
				{typeLabels[type] || type}
			</button>
		{/each}

		{#if hasFilters}
			<button
				class="px-3 py-1 text-sm text-neutral-400 hover:text-neutral-600 transition-colors no-underline"
				on:click={clearFilters}
			>
				Clear filters
			</button>
		{/if}
	</div>

	{#if hasFilters && activeTags.size > 0}
		<div class="flex flex-wrap gap-1.5 mb-2">
			{#each [...activeTags] as tag}
				<button
					class="rounded-full py-0.5 px-2.5 text-xs bg-neutral-700 text-white border border-neutral-700 transition-colors no-underline"
					on:click={() => toggleTag(tag)}
				>
					{tag} &times;
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- Post count -->
<div class="text-xs text-neutral-400 mb-6">
	{filteredPosts.length} of {allPostSummaries.length} entries
</div>

<!-- Card grid -->
<div
	class="card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
	class:has-hover={isAnyHovered}
	on:mouseleave={() => (hoveredPost = undefined)}
>
	{#each filteredPosts as post}
		<a
			href={`/journal/${post.id}`}
			class="card group flex flex-col p-5 rounded-2xl no-underline transition-all duration-[600ms] ease-in-out"
			class:is-active={hoveredPost === post}
			class:is-dimmed={isAnyHovered && hoveredPost !== post}
			on:mouseenter={() => (hoveredPost = post)}
		>
			<div class="flex items-start justify-between gap-2 mb-3">
				<h3
					class="text-base font-semibold text-neutral-800 group-hover:text-neutral-950 no-underline"
				>
					{post.title}
				</h3>
				<span class="text-xs text-neutral-400 whitespace-nowrap pt-0.5">
					{new Date(post.timestamp).toLocaleDateString('en-US', {
						month: 'short',
						year: 'numeric'
					})}
				</span>
			</div>

			{#if post.collaborators?.length}
				<div class="mb-2">
					{#each post.collaborators as collab}
						<span class="text-xs text-neutral-500 italic">
							{collab.role}:
							{#if collab.url}
								<span
									class="collab-link underline underline-offset-2"
									on:click|preventDefault|stopPropagation={() => window.open(collab.url, '_blank')}
									>{collab.name}</span
								>
							{:else}
								{collab.name}
							{/if}
						</span>
					{/each}
				</div>
			{/if}

			<div class="mt-auto pt-2">
				<Tags tags={post.tags ?? []} {activeTags} onTagClick={toggleTag} />
			</div>
		</a>
	{/each}
</div>

<style>
	a h3 {
		text-decoration: none;
	}

	.collab-link {
		cursor: pointer;
		text-decoration: underline;
		color: inherit;
	}
	.collab-link:hover {
		color: rgb(23, 23, 23);
	}

	.card {
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.card:hover {
		background: rgba(255, 255, 255, 0.9);
		border-color: rgba(0, 0, 0, 0.1);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.08),
			0 1px 3px rgba(0, 0, 0, 0.06);
		transform: translateY(-2px);
	}

	.card.is-dimmed {
		opacity: 0.45;
		transform: scale(0.98);
	}

	.card.is-active {
		background: rgba(255, 255, 255, 0.92);
		border-color: rgba(0, 0, 0, 0.12);
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.1),
			0 2px 6px rgba(0, 0, 0, 0.06);
		transform: translateY(-3px);
	}
</style>
