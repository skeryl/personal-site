<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { PostSummary } from '@sc/model';
	import videos from '$lib/assets/videos/posts/index.js';

	const PREFETCH_RADIUS = 2; // preload ±2 around active = 5 total

	interface Props {
		posts: PostSummary[];
	}

	let { posts }: Props = $props();

	let wrapper: HTMLDivElement | undefined = $state(undefined);
	let previewContainer: HTMLDivElement | undefined = $state(undefined);
	let scrollContainer: HTMLDivElement | undefined = $state(undefined);

	let activeIndex: number = $state(0);
	let activePost: PostSummary | undefined = $derived(posts[activeIndex]);
	let hasVideo = $derived(activePost ? activePost.id in videos : false);

	// ── Video pool ───────────────────────────────────────────
	// Each entry holds a <video> element that's already appended to the
	// preview container (absolutely positioned, object-fit:cover, opacity:0).
	// When its readyState reaches HAVE_FUTURE_DATA the video is decoded at
	// its final cover dimensions — flipping opacity is jitter-free.
	interface PoolEntry {
		video: HTMLVideoElement;
		ready: boolean;
	}
	let pool: Map<string, PoolEntry> = new Map();

	let isActiveReady: boolean = $state(false);

	function getMimeType(src: string): string {
		const ext = src.split('.').pop()?.split('?')[0] ?? '';
		const types: Record<string, string> = {
			mp4: 'video/mp4',
			webm: 'video/webm',
			mov: 'video/quicktime'
		};
		return types[ext] || 'video/mp4';
	}

	function createVideoElement(postId: string): PoolEntry {
		const video = document.createElement('video');
		video.autoplay = false;
		video.loop = true;
		video.muted = true;
		video.playsInline = true;
		video.preload = 'auto';
		video.className = 'preview-video';

		const source = document.createElement('source');
		const src = videos[postId];
		source.src = `${src}#t=[3]`;
		source.type = getMimeType(src);
		video.appendChild(source);

		const entry: PoolEntry = { video, ready: false };

		video.addEventListener('canplay', () => {
			entry.ready = true;
			// If this is the currently active video, reveal it
			if (activePost?.id === postId) {
				requestAnimationFrame(() => {
					isActiveReady = true;
				});
			}
		});

		video.load();
		previewContainer?.appendChild(video);

		return entry;
	}

	function getWindowPostIds(): string[] {
		const ids: string[] = [];
		for (
			let i = Math.max(0, activeIndex - PREFETCH_RADIUS);
			i <= Math.min(posts.length - 1, activeIndex + PREFETCH_RADIUS);
			i++
		) {
			const id = posts[i]?.id;
			if (id && id in videos) {
				ids.push(id);
			}
		}
		return ids;
	}

	// Sync the pool whenever the active index or post list changes
	$effect(() => {
		// Dependencies
		void activeIndex;
		void posts.length;

		if (!previewContainer) return;

		const windowIds = new Set(getWindowPostIds());

		// Remove entries outside the window
		for (const [id, entry] of pool) {
			if (!windowIds.has(id)) {
				entry.video.pause();
				entry.video.removeAttribute('src');
				entry.video.load();
				entry.video.remove();
				pool.delete(id);
			}
		}

		// Add entries inside the window that aren't pooled yet
		for (const id of windowIds) {
			if (!pool.has(id)) {
				pool.set(id, createVideoElement(id));
			}
		}

		// Update visibility: only the active video is shown
		const activeId = activePost?.id;
		for (const [id, entry] of pool) {
			if (id === activeId) {
				entry.video.classList.add('is-visible');
				entry.video.play().catch(() => {});
			} else {
				entry.video.classList.remove('is-visible');
				entry.video.pause();
			}
		}

		// Update ready state for skeleton
		if (activeId && pool.has(activeId)) {
			const entry = pool.get(activeId)!;
			if (entry.ready) {
				// Already decoded at cover size — reveal immediately
				requestAnimationFrame(() => {
					isActiveReady = true;
				});
			} else {
				isActiveReady = false;
			}
		} else {
			isActiveReady = false;
		}
	});

	// Size the wrapper to fill from its top edge to the bottom of the viewport.
	// Use requestAnimationFrame so the browser has completed layout before we measure.
	onMount(() => {
		if (!wrapper) return;

		function measure() {
			if (!wrapper) return;
			const top = wrapper.getBoundingClientRect().top;
			wrapper.style.height = `calc(100dvh - ${top}px - 8px)`;
		}

		requestAnimationFrame(measure);

		// Re-measure when the mobile address bar collapses/expands
		window.addEventListener('resize', measure);

		return () => {
			window.removeEventListener('resize', measure);
			for (const [, entry] of pool) {
				entry.video.pause();
				entry.video.removeAttribute('src');
				entry.video.load();
				entry.video.remove();
			}
			pool.clear();
		};
	});

	// Re-observe cards whenever the post list changes
	$effect(() => {
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

		tick().then(() => {
			const cards = scrollContainer!.querySelectorAll('.carousel-card');
			cards.forEach((card) => observer.observe(card));
		});

		activeIndex = 0;
		scrollContainer.scrollTo({ left: 0 });

		return () => observer.disconnect();
	});

	function scrollToIndex(index: number) {
		if (!scrollContainer) return;
		const cards = scrollContainer.querySelectorAll('.carousel-card');
		cards[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
	}

	// ── Preview swipe handling ───────────────────────────────
	// Swiping on the preview drives the caption carousel (and thus the
	// active index via IntersectionObserver). The preview itself stays
	// fixed — only the content crossfades.
	let touchStartX: number | undefined;
	const SWIPE_THRESHOLD = 40; // min px to count as a swipe

	function onPreviewTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}

	function onPreviewTouchEnd(e: TouchEvent) {
		if (touchStartX === undefined) return;
		const dx = e.changedTouches[0].clientX - touchStartX;
		touchStartX = undefined;

		if (Math.abs(dx) < SWIPE_THRESHOLD) return;

		if (dx < 0 && activeIndex < posts.length - 1) {
			scrollToIndex(activeIndex + 1);
		} else if (dx > 0 && activeIndex > 0) {
			scrollToIndex(activeIndex - 1);
		}
	}
</script>

<div class="carousel-wrapper" bind:this={wrapper}>
	<!-- Preview area: pool videos are appended here via JS -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="preview-area"
		class:has-video={hasVideo && isActiveReady}
		bind:this={previewContainer}
		ontouchstart={onPreviewTouchStart}
		ontouchend={onPreviewTouchEnd}
	>
		<!-- Skeleton loader while active video decodes -->
		{#if hasVideo && !isActiveReady}
			<div class="skeleton-overlay">
				<div class="skeleton-shimmer"></div>
			</div>
		{/if}

		{#if !hasVideo}
			<div class="preview-placeholder">
				<span class="preview-placeholder-text">
					{#if activePost}
						{activePost.title}
					{/if}
				</span>
			</div>
		{/if}

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

	<!-- Slim caption carousel -->
	<div class="carousel-scroll" bind:this={scrollContainer}>
		{#each posts as post, i}
			<a
				href={`/journal/${post.id}`}
				class="carousel-card no-underline"
				class:is-active={activeIndex === i}
				data-index={i}
			>
				<div class="caption-inner">
					<div class="caption-row">
						<h3 class="caption-title">{post.title}</h3>
						<span class="caption-date">
							{new Date(post.timestamp).toLocaleDateString('en-US', {
								month: 'short',
								year: 'numeric'
							})}
						</span>
					</div>
					{#if post.tags?.length}
						<div class="caption-tags">
							{#each post.tags as tag}
								<span class="caption-tag">{tag}</span>
							{/each}
						</div>
					{/if}
				</div>
			</a>
		{/each}
	</div>
</div>

<style>
	.carousel-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* ── Preview area ─────────────────────────────────────── */
	.preview-area {
		position: relative;
		flex: 1 1 0%;
		min-height: 0;
		border-radius: 0.75rem;
		overflow: hidden;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		touch-action: pan-y;
	}

	/* Video elements are appended via JS; this styles them all */
	.preview-area :global(.preview-video) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
	}

	.preview-area :global(.preview-video.is-visible) {
		opacity: 1;
	}

	/* Hide all videos until at least the active one is ready */
	.preview-area:not(.has-video) :global(.preview-video) {
		opacity: 0 !important;
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

	/* ── Dots (overlaid on preview) ───────────────────────── */
	.dots {
		position: absolute;
		bottom: 0.5rem;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		gap: 0.375rem;
		z-index: 2;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		border: none;
		padding: 0;
		background: rgba(255, 255, 255, 0.5);
		transition: all 0.25s ease;
		cursor: pointer;
	}

	.dot.active {
		background: rgba(255, 255, 255, 0.95);
		transform: scale(1.3);
	}

	/* ── Scroll container ─────────────────────────────────── */
	.carousel-scroll {
		flex-shrink: 0;
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
		gap: 0.5rem;
		padding: 0 8%;
		scrollbar-width: none;
	}

	.carousel-scroll::-webkit-scrollbar {
		display: none;
	}

	/* ── Caption card ─────────────────────────────────────── */
	.carousel-card {
		flex: 0 0 84%;
		min-width: 0;
		scroll-snap-align: center;
		text-decoration: none;
	}

	.caption-inner {
		padding: 0.625rem 0.875rem;
		border-radius: 0.625rem;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		overflow: hidden;
		transition:
			background 0.3s ease,
			border-color 0.3s ease;
	}

	.carousel-card.is-active .caption-inner {
		background: var(--card-bg-active);
		border-color: var(--card-border-active);
	}

	.caption-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.caption-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-heading);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
		margin: 0;
	}

	.caption-date {
		font-size: 0.6875rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.caption-tags {
		display: flex;
		gap: 0.375rem;
		margin-top: 0.25rem;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.caption-tags::-webkit-scrollbar {
		display: none;
	}

	.caption-tag {
		font-size: 0.625rem;
		color: var(--color-tag-text);
		background: var(--color-tag-bg);
		border-radius: 9999px;
		padding: 0.1rem 0.5rem;
		white-space: nowrap;
		flex-shrink: 0;
	}
</style>
