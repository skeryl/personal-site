<script lang="ts">
	import { preventDefault, stopPropagation } from 'svelte/legacy';

	import { PostType, type PostSummary } from '@sc/model';
	import Tags from '$lib/components/Tags.svelte';
	import allPosts from '$lib/entries';
	import PostVideoPreview from '$lib/components/PostVideoPreview.svelte';
	import MobileCardCarousel from '$lib/components/MobileCardCarousel.svelte';

	interface Props {
		limit?: number | undefined;
	}

	let { limit = undefined }: Props = $props();

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
	let activeType: string | null = $state(null);

	// Tag filter
	let activeTags: Set<string> = $state(new Set());

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
	let allTags = $derived([...new Set(allPostSummaries.flatMap((p) => p.tags))].sort());

	// Collect unique types
	let allTypes = $derived([...new Set(allPostSummaries.map((p) => p.type))]);

	// Filtered posts
	let filteredPosts = $derived(
		allPostSummaries.filter((post) => {
			if (activeType && post.type !== activeType) return false;
			if (activeTags.size > 0 && !post.tags.some((t) => activeTags.has(t))) return false;
			return true;
		})
	);

	let hasFilters = $derived(activeType !== null || activeTags.size > 0);

	let hoveredPost: PostSummary | undefined = $state();
	let isAnyHovered = $derived(hoveredPost !== undefined);
</script>

<!-- Desktop: fullscreen background video preview (hidden on mobile) -->
<div class="hidden sm:block">
	<PostVideoPreview selectedPost={hoveredPost} />
</div>

<!-- Filter bar -->
<div class="mb-6 max-sm:mb-2">
	<div class="flex flex-wrap items-center gap-2 max-sm:gap-1.5 mb-3 max-sm:mb-1.5">
		{#each allTypes as type}
			<button
				class="px-3 py-1 max-sm:px-2 max-sm:py-0.5 text-sm max-sm:text-xs font-medium rounded-md transition-colors no-underline"
				class:bg-theme-filter-active-bg={activeType === type}
				class:text-theme-filter-active-text={activeType === type}
				class:bg-theme-filter-bg={activeType !== type}
				class:text-theme-filter-text={activeType !== type}
				class:hover:bg-theme-filter-hover-bg={activeType !== type}
				onclick={() => toggleType(type)}
			>
				{typeLabels[type] || type}
			</button>
		{/each}

		{#if hasFilters}
			<button
				class="px-3 py-1 max-sm:px-2 max-sm:py-0.5 text-sm max-sm:text-xs text-theme-text-muted hover:text-theme-text-secondary transition-colors no-underline"
				onclick={clearFilters}
			>
				Clear filters
			</button>
		{/if}

		<!-- Post count (inline on mobile) -->
		<span class="text-xs text-theme-text-muted sm:hidden ml-auto">
			{filteredPosts.length}/{allPostSummaries.length}
		</span>
	</div>

	{#if hasFilters && activeTags.size > 0}
		<div class="flex flex-wrap gap-1.5 mb-2 max-sm:mb-1">
			{#each [...activeTags] as tag}
				<button
					class="rounded-full py-0.5 px-2.5 text-xs bg-theme-tag-active-bg text-theme-tag-active-text border border-theme-tag-active-border transition-colors no-underline"
					onclick={() => toggleTag(tag)}
				>
					{tag} &times;
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- Post count (desktop only) -->
<div class="text-xs text-theme-text-muted mb-6 max-sm:hidden">
	{filteredPosts.length} of {allPostSummaries.length} entries
</div>

<!-- Mobile: swipeable card carousel with inline preview -->
<div class="sm:hidden">
	<MobileCardCarousel posts={filteredPosts} />
</div>

<!-- Desktop: card grid (hidden on mobile) -->
<div
	class="card-grid hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
	class:has-hover={isAnyHovered}
	onmouseleave={() => (hoveredPost = undefined)}
>
	{#each filteredPosts as post}
		<a
			href={`/journal/${post.id}`}
			class="card group flex flex-col p-5 rounded-2xl no-underline transition-all duration-[600ms] ease-in-out"
			class:is-active={hoveredPost?.id === post.id}
			class:is-dimmed={isAnyHovered && hoveredPost?.id !== post.id}
			onmouseenter={() => (hoveredPost = post)}
		>
			<div class="flex items-start justify-between gap-2 mb-3">
				<h3
					class="text-base font-semibold text-theme-text-heading group-hover:text-theme-text-strong no-underline"
				>
					{post.title}
				</h3>
				<span class="text-xs text-theme-text-muted whitespace-nowrap pt-0.5">
					{new Date(post.timestamp).toLocaleDateString('en-US', {
						month: 'short',
						year: 'numeric'
					})}
				</span>
			</div>

			{#if post.collaborators?.length}
				<div class="mb-2">
					{#each post.collaborators as collab}
						<span class="text-xs text-theme-text-secondary italic">
							{collab.role}:
							{#if collab.url}
								<span
									class="collab-link underline underline-offset-2"
									onclick={stopPropagation(preventDefault(() => window.open(collab.url, '_blank')))}
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
		color: var(--collab-link-hover);
	}

	.card {
		background: var(--card-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--card-border);
		box-shadow: var(--card-shadow);
	}

	.card:hover {
		background: var(--card-bg-hover);
		border-color: var(--card-border-hover);
		box-shadow: var(--card-shadow-hover);
		transform: translateY(-2px);
	}

	.card.is-dimmed {
		opacity: 0.45;
		transform: scale(0.98);
	}

	.card.is-active {
		opacity: 1;
		background: var(--card-bg-active);
		border-color: var(--card-border-active);
		box-shadow: var(--card-shadow-active);
		transform: translateY(-3px);
	}
</style>
