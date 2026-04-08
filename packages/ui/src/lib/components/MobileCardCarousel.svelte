<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { PostSummary } from '@sc/model';
	import videos from '$lib/assets/videos/posts/index.js';

	interface Props {
		posts: PostSummary[];
	}

	let { posts }: Props = $props();

	let wrapper: HTMLDivElement | undefined = $state(undefined);
	let scrollContainer: HTMLDivElement | undefined = $state(undefined);

	// Measure how far from the top of the viewport this component sits,
	// then size the wrapper to fill exactly the remaining space.
	onMount(() => {
		if (!wrapper) return;
		const top = wrapper.getBoundingClientRect().top;
		// 8px bottom breathing room
		wrapper.style.height = `calc(100dvh - ${top}px - 8px)`;
	});
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

	function handleVideoCanPlay() {
		requestAnimationFrame(() => {
			isVideoReady = true;
			isLoading = false;
		});
	}

	// Re-observe cards whenever the post list changes (e.g. filtering)
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
</script>

<div class="carousel-wrapper" bind:this={wrapper}>
	<!-- Preview area: takes all available vertical space -->
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

		<!-- Dot indicators overlaid at bottom of preview -->
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
