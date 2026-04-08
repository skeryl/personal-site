<script lang="ts">
	import { preventDefault, stopPropagation } from 'svelte/legacy';
	import { tick } from 'svelte';
	import type { PostSummary } from '@sc/model';
	import Tags from '$lib/components/Tags.svelte';
	import videos from '$lib/assets/videos/posts/index.js';

	interface Props {
		posts: PostSummary[];
		activeTags: Set<string>;
		onTagClick: (tag: string) => void;
		onActivePostChange?: (post: PostSummary | undefined) => void;
	}

	let { posts, activeTags, onTagClick, onActivePostChange }: Props = $props();

	let scrollContainer: HTMLDivElement | undefined = $state(undefined);
	let activeIndex: number = $state(0);
	let activePost: PostSummary | undefined = $derived(posts[activeIndex]);
	let hasVideo = $derived(activePost ? activePost.id in videos : false);

	// Video preview state
	let vid: HTMLVideoElement | undefined = $state(undefined);
	let currentVideoId: string | undefined = $state(undefined);
	let isVideoReady: boolean = $state(false);
	let isLoading: boolean = $state(false);

	$effect(() => {
		if (activePost && activePost.id in videos && vid) {
			if (currentVideoId !== activePost.id) {
				isVideoReady = false;
				isLoading = true;
				const sources = Array.from(vid.querySelectorAll('source'));
				sources.forEach((src) => src.remove());
				vid.load();

				const source = document.createElement('source');
				const src = videos[activePost.id];
				source.setAttribute('src', `${src}#t=[3]`);
				const ext = src.split('.').pop()?.split('?')[0] ?? '';
				const mimeTypes: Record<string, string> = {
					mp4: 'video/mp4',
					webm: 'video/webm',
					mov: 'video/quicktime'
				};
				source.setAttribute('type', mimeTypes[ext] || 'video/mp4');
				vid.appendChild(source);
				vid.load();
				vid.play();
				currentVideoId = activePost.id;
			}
		} else if (vid && !activePost) {
			const sources = Array.from(vid.querySelectorAll('source'));
			sources.forEach((src) => src.remove());
			vid.load();
			currentVideoId = undefined;
			isVideoReady = false;
			isLoading = false;
		}
	});

	$effect(() => {
		onActivePostChange?.(activePost);
	});

	function handleVideoCanPlay() {
		// Wait one frame so the browser paints the video at its cover dimensions
		// before we reveal it — avoids the visible resize snap.
		requestAnimationFrame(() => {
			isVideoReady = true;
			isLoading = false;
		});
	}

	// Re-observe cards whenever the post list changes (e.g. filtering)
	$effect(() => {
		// Track `posts` so we re-run when the list changes
		void posts.length;

		if (!scrollContainer) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
						const idx = Number(entry.target.getAttribute('data-index'));
						if (!isNaN(idx)) {
							activeIndex = idx;
						}
					}
				}
			},
			{
				root: scrollContainer,
				threshold: 0.6
			}
		);

		// Wait for DOM to update with the new cards
		tick().then(() => {
			const cards = scrollContainer!.querySelectorAll('.carousel-card');
			cards.forEach((card) => observer.observe(card));
		});

		// Reset scroll position and active index on filter change
		activeIndex = 0;
		scrollContainer.scrollTo({ left: 0 });

		return () => observer.disconnect();
	});

	function scrollToIndex(index: number) {
		if (!scrollContainer) return;
		const cards = scrollContainer.querySelectorAll('.carousel-card');
		cards[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
	}
</script>

<div class="carousel-wrapper">
	<!-- Video preview area -->
	<div class="preview-area" class:has-video={hasVideo && isVideoReady}>
		<video
			bind:this={vid}
			autoplay
			loop
			muted
			playsinline
			class="preview-video"
			oncanplay={handleVideoCanPlay}
		></video>

		<!-- Skeleton loader: covers the video while it loads to hide the resize snap -->
		{#if isLoading}
			<div class="skeleton-overlay">
				<div class="skeleton-shimmer"></div>
			</div>
		{/if}

		{#if !hasVideo && !isLoading}
			<div class="preview-placeholder">
				<span class="preview-placeholder-text">
					{#if activePost}
						{activePost.title}
					{/if}
				</span>
			</div>
		{/if}
	</div>

	<!-- Scrollable card carousel -->
	<div class="carousel-scroll" bind:this={scrollContainer}>
		{#each posts as post, i}
			<a
				href={`/journal/${post.id}`}
				class="carousel-card no-underline"
				class:is-active={activeIndex === i}
				data-index={i}
			>
				<div class="card-inner">
					<div class="flex items-start justify-between gap-2 mb-2">
						<h3 class="text-base font-semibold text-theme-text-heading no-underline">
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
											onclick={stopPropagation(
												preventDefault(() => window.open(collab.url, '_blank'))
											)}>{collab.name}</span
										>
									{:else}
										{collab.name}
									{/if}
								</span>
							{/each}
						</div>
					{/if}

					<div class="mt-auto pt-2">
						<Tags tags={post.tags ?? []} {activeTags} {onTagClick} />
					</div>
				</div>
			</a>
		{/each}
	</div>

	<!-- Dot indicators -->
	{#if posts.length > 1}
		<div class="dots">
			{#each posts as _, i}
				<button
					class="dot no-underline"
					class:active={activeIndex === i}
					onclick={() => scrollToIndex(i)}
					aria-label={`Go to card ${i + 1}`}
				></button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.carousel-wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* ── Preview area ─────────────────────────────────────── */
	.preview-area {
		position: relative;
		width: 100%;
		aspect-ratio: 3 / 4;
		max-height: 55vh;
		border-radius: 1rem;
		overflow: hidden;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
	}

	.preview-video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 0.35s ease;
	}

	.preview-area.has-video .preview-video {
		opacity: 1;
	}

	/* ── Skeleton loader ──────────────────────────────────── */
	.skeleton-overlay {
		position: absolute;
		inset: 0;
		background: var(--color-surface);
		z-index: 1;
	}

	.skeleton-shimmer {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			110deg,
			transparent 30%,
			var(--color-surface-secondary) 50%,
			transparent 70%
		);
		animation: shimmer 1.4s ease-in-out infinite;
	}

	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	.preview-placeholder {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.preview-placeholder-text {
		font-family: var(--font-heading);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-align: center;
	}

	/* ── Scroll container ─────────────────────────────────── */
	.carousel-scroll {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
		gap: 0.75rem;
		padding: 0 8%;
		scrollbar-width: none;
	}

	.carousel-scroll::-webkit-scrollbar {
		display: none;
	}

	/* ── Card ─────────────────────────────────────────────── */
	.carousel-card {
		flex: 0 0 84%;
		scroll-snap-align: center;
		text-decoration: none;
		transition: all 0.3s ease;
	}

	.card-inner {
		display: flex;
		flex-direction: column;
		padding: 1.25rem;
		border-radius: 1rem;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		box-shadow: var(--card-shadow);
		min-height: 100px;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		transition: all 0.3s ease;
	}

	.carousel-card.is-active .card-inner {
		background: var(--card-bg-active);
		border-color: var(--card-border-active);
		box-shadow: var(--card-shadow-active);
	}

	.collab-link {
		cursor: pointer;
		text-decoration: underline;
		color: inherit;
	}

	/* ── Dots ─────────────────────────────────────────────── */
	.dots {
		display: flex;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.25rem 0;
		flex-wrap: wrap;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		border: none;
		padding: 0;
		background: var(--color-border-strong);
		opacity: 0.35;
		transition: all 0.25s ease;
		cursor: pointer;
	}

	.dot.active {
		opacity: 1;
		background: var(--color-text-heading);
		transform: scale(1.3);
	}

	a h3 {
		text-decoration: none;
	}
</style>
