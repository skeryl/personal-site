<script lang="ts">
	import { run } from 'svelte/legacy';

	import { onMount, onDestroy, setContext } from 'svelte';
	import { type Post, PostType } from '@sc/model';
	import ContentRendererStage from '$lib/components/ContentRendererStage.svelte';
	import ContentRendererThree from '$lib/components/ContentRendererThree.svelte';
	import ContentRendererExploration from '$lib/components/ContentRendererExploration.svelte';
	import PostControlBar from '$lib/components/PostControlBar.svelte';
	import {
		PlayState,
		PostControlContext,
		IgFormatChangedEvent,
		IG_FORMATS,
		type IgFormat
	} from '$lib/state/post-control';
	import type { ContentParams } from '$lib/content-params';
	import PostParams from '$lib/components/PostParams.svelte';
	import Icon from '$lib/components/icons/Icon.svelte';
	import { compactNav, fullbleed, navTitle, paramsOpen } from '$lib/state/layout';

	const postControlContext = new PostControlContext({
		playState: PlayState.playing,
		isFullScreen: false
	});

	setContext('post-control', postControlContext);

	interface Props {
		post: Post | undefined;
		hideHeader?: boolean;
	}

	let { post = $bindable(), hideHeader = false }: Props = $props();

	let title = $derived(post?.summary?.title);
	let date = $derived(post?.summary.timestamp);
	let requiresCanvas = $derived(
		post?.summary?.type === PostType.experiment || post?.summary?.type === PostType.experiment3d
	);

	const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
	let igFormat: IgFormat = $state(
		((isMobile && post?.summary.preferredMobileFormat
			? post.summary.preferredMobileFormat
			: post?.summary.preferredFormat) as IgFormat) ?? null
	);
	let igRatio = $derived(igFormat ? IG_FORMATS[igFormat].ratio : null);
	let igContainerStyle = $derived.by(() => {
		if (!igRatio) return '';
		const [w, h] = igRatio.split('/').map((s) => s.trim());
		return `aspect-ratio: ${igRatio}; width: min(100%, calc((100dvh - 12rem) * ${w} / ${h})); height: auto;`;
	});

	postControlContext.addEventListener('post-ig-format-changed', (ev) => {
		igFormat = (ev as IgFormatChangedEvent).format;
		setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
	});

	// Set synchronously so the layout is correct before the canvas initialises
	compactNav.set(!!requiresCanvas);
	fullbleed.set(!!requiresCanvas);
	navTitle.set(post?.summary?.title ?? null);
	onDestroy(() => {
		compactNav.set(false);
		fullbleed.set(false);
		navTitle.set(null);
		paramsOpen.set(false);
		// Flush any pending param save before tearing down
		if (saveParamsTimer) {
			clearTimeout(saveParamsTimer);
			if (post?.params) persistParams(post.params);
		}
	});

	let container: HTMLDivElement | undefined = $state(undefined);
	let cnv: HTMLCanvasElement | undefined = $state(undefined);
	let controlArea: HTMLDivElement | undefined = $state(undefined);
	let areParamsOpen = $state(false);

	function onDocumentClick(e: MouseEvent) {
		if (areParamsOpen && controlArea && !controlArea.contains(e.target as Node)) {
			closeParams();
		}
	}

	onMount(() => {
		document.addEventListener('click', onDocumentClick, true);
		return () => document.removeEventListener('click', onDocumentClick, true);
	});

	function isFullscreen(): boolean {
		return Boolean(document.fullscreenElement);
	}

	function takeScreenshot() {
		if (!cnv) return;
		const dataURL = cnv.toDataURL('image/png');
		const a = document.createElement('a');
		a.href = dataURL;
		a.download = `${post?.summary?.id ?? 'screenshot'}.png`;
		a.style.cssText = 'position:absolute;visibility:hidden';
		document.body.appendChild(a);
		a.click();
		setTimeout(() => document.body.removeChild(a), 100);
	}

	function toggleFullScreen() {
		if (isFullscreen()) {
			document.exitFullscreen().then(() => {
				console.log('full screen exited.');
				postControlContext.setFullScreen(false);
			});
		} else {
			cnv?.parentElement?.requestFullscreen().then(() => {
				console.log('entered full screen');
				postControlContext.setFullScreen(true);
			});
		}
	}

	function toggleParams() {
		areParamsOpen = !areParamsOpen;
		paramsOpen.set(areParamsOpen);
	}

	function closeParams() {
		areParamsOpen = false;
		paramsOpen.set(false);
	}

	function getParamsStorageKey(): string | undefined {
		return post?.summary?.id ? `post-params:${post.summary.id}` : undefined;
	}

	let saveParamsTimer: ReturnType<typeof setTimeout> | undefined;
	function persistParams(params: ContentParams) {
		const key = getParamsStorageKey();
		if (!key) return;
		try {
			const data = params.map((p) => ({ id: p.id, value: p.value }));
			localStorage.setItem(key, JSON.stringify(data));
		} catch {
			/* storage full or unavailable */
		}
	}

	function onParamChange(params: ContentParams) {
		// Dispatch to the simulation via event system — do NOT update
		// `post` here, as that would trigger ContentRendererStage's run()
		// effect, which calls content.start() and recreates all blobs.
		postControlContext.setParams(params);
		// Debounce localStorage writes — synchronous writes during a slider
		// drag block the main thread and starve the animation loop on mobile.
		if (saveParamsTimer) clearTimeout(saveParamsTimer);
		saveParamsTimer = setTimeout(() => persistParams(params), 250);
	}

	function loadSavedParams(): ContentParams | undefined {
		const key = getParamsStorageKey();
		if (!key || !post?.params) return undefined;
		try {
			const raw = localStorage.getItem(key);
			// DEBUG: log what's saved and skip loading it
			if (raw) {
				console.log('[DEBUG] Saved params for', key, ':', raw);
				console.log('[DEBUG] Ignoring saved params — using defaults');
				localStorage.removeItem(key); // clear stale data
			}
			return undefined;
		} catch {
			return undefined;
		}
	}

	let hasLoadedSavedParams = false;

	run(() => {
		if (post?.params && !hasLoadedSavedParams) {
			hasLoadedSavedParams = true;
			const saved = loadSavedParams();
			if (saved) {
				post = { ...post, params: saved };
				postControlContext.setParams(saved);
			}
		}
	});
</script>

<div
	class:experiment-layout={requiresCanvas && (!$fullbleed || igRatio)}
	class:fullbleed-layout={$fullbleed && !igRatio}
	class:ratio-centering={!!igRatio}
>
	{#if !hideHeader}
		<!-- Full header: desktop always, mobile for non-experiments -->
		<div class="post-header" class:experiment-header-full={requiresCanvas}>
			<a
				href="/"
				class="text-sm text-theme-text-muted hover:text-theme-text-secondary no-underline transition-colors"
				>← journal</a
			>
			<div class="flex flex-row items-baseline mt-2">
				<h1 class="flex-1">{title}</h1>
				<div>
					{date?.toLocaleDateString()}
				</div>
			</div>
			{#if post?.summary.collaborators?.length}
				<div class="flex flex-wrap gap-x-4 gap-y-1 mb-3 -mt-1">
					{#each post.summary.collaborators as collab}
						<span class="text-sm text-theme-text-secondary">
							{collab.role}:
							{#if collab.url}
								<a
									href={collab.url}
									target="_blank"
									rel="noopener noreferrer"
									class="underline underline-offset-2 hover:text-theme-text-heading transition-colors"
									>{collab.name}</a
								>
							{:else}
								{collab.name}
							{/if}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Compact header: mobile experiments only -->
		{#if requiresCanvas}
			<div class="experiment-header-compact flex-shrink-0">
				<a href="/" class="flex items-center justify-center no-underline shrink-0 back-btn"
					><Icon type="chevron-left" size="sm" className="!text-inherit hover:!text-inherit" /></a
				>
				<span class="text-sm font-semibold truncate flex-1">{title}</span>
				<span class="text-xs text-theme-text-muted shrink-0">{date?.toLocaleDateString()}</span>
			</div>
		{/if}
	{/if}

	<div
		bind:this={container}
		class={$fullbleed && !igRatio
			? 'absolute inset-0'
			: igRatio
				? 'relative mx-auto'
				: `flex flex-1 relative ${requiresCanvas ? 'min-h-0' : 'min-h-[80vh]'}`}
		style={igContainerStyle}
	>
		{#if requiresCanvas}
			<canvas class="absolute inset-0 w-full h-full" bind:this={cnv}
				>your browser does not support HTML canvas :(</canvas
			>
		{/if}

		{#if post}
			{#if post.summary.type === PostType.experiment}
				<ContentRendererStage {post} {container} {cnv} />
			{:else if post.summary.type === PostType.experiment3d}
				<ContentRendererThree {post} {cnv} />
			{:else}
				<ContentRendererExploration {post} />
			{/if}
		{/if}
	</div>

	{#if requiresCanvas}
		<!-- Control bar: always at the bottom, never moves -->
		<div class="flex-shrink-0 control-area control-area-overlay">
			<PostControlBar
				{toggleFullScreen}
				{takeScreenshot}
				postId={post?.summary.id}
				hasParams={Boolean(post?.params)}
				{toggleParams}
				paramsOpen={areParamsOpen}
				initialIgFormat={igFormat}
			/>
		</div>
	{/if}
</div>

<!-- Params panel: rendered outside fullbleed-layout so it can exceed its stacking context -->
{#if requiresCanvas && areParamsOpen && post && post.params}
	<div class="params-panel" bind:this={controlArea}>
		<PostParams params={post.params} onParamsChange={onParamChange} onClose={closeParams} />
	</div>
{/if}

<style>
	.experiment-layout {
		flex: none;
		height: calc(100dvh - 6rem);
	}

	.ratio-centering {
		position: fixed;
		inset: 0;
		height: 100dvh; /* override experiment-layout's height */
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fullbleed-layout {
		position: fixed;
		inset: 0;
		z-index: 10;
		background: #000;
	}

	/* Override any inline styles set by the entry's start() method */
	.fullbleed-layout > div:not(.control-area):not(.params-panel) {
		aspect-ratio: unset !important;
		max-height: unset !important;
		width: 100% !important;
		height: 100% !important;
		margin: 0 !important;
	}

	.control-area-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
	}

	/* Params panel: full-height right sidebar, above nav */
	.params-panel {
		position: fixed;
		right: 0;
		top: 0;
		bottom: 0;
		width: 240px;
		z-index: 60;
		overflow: hidden;
	}

	@media (min-width: 640px) {
		.params-panel {
			width: 260px;
		}
	}

	@media (max-width: 639px) {
		.params-panel {
			top: auto;
			left: 0;
			right: 0;
			width: 100%;
			height: auto;
		}
	}

	.experiment-header-compact {
		display: none;
	}

	@media (max-width: 639px) {
		.experiment-layout {
			height: calc(100dvh - 0.75rem);
		}

		.experiment-header-full {
			display: none;
		}

		.experiment-header-compact {
			display: flex;
			align-items: center;
			gap: 0.25rem;
			height: 2.75rem;
			margin: 0 -0.75rem;
			padding: 0 0.75rem;
		}

		.experiment-header-compact .back-btn {
			width: 2.75rem;
			height: 2.75rem;
			margin-left: -0.75rem;
			color: var(--color-text-secondary);
			transition: color 0.15s;
		}

		.experiment-header-compact .back-btn:hover {
			color: var(--color-text-heading);
		}
	}
</style>
