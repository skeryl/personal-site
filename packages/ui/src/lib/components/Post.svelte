<script lang="ts">
	import { run } from 'svelte/legacy';

	import { onMount, setContext } from 'svelte';
	import { type Post, PostType } from '@sc/model';
	import ContentRendererStage from '$lib/components/ContentRendererStage.svelte';
	import ContentRendererThree from '$lib/components/ContentRendererThree.svelte';
	import ContentRendererExploration from '$lib/components/ContentRendererExploration.svelte';
	import PostControlBar from '$lib/components/PostControlBar.svelte';
	import { PlayState, PostControlContext } from '$lib/state/post-control';
	import type { ContentParams } from '$lib/content-params';
	import PostParams from '$lib/components/PostParams.svelte';

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

	let container: HTMLDivElement | undefined = $state(undefined);
	let cnv: HTMLCanvasElement | undefined = $state(undefined);
	let controlArea: HTMLDivElement | undefined = $state(undefined);
	let areParamsOpen = $state(false);

	function onDocumentClick(e: MouseEvent) {
		if (areParamsOpen && controlArea && !controlArea.contains(e.target as Node)) {
			areParamsOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', onDocumentClick, true);
		return () => document.removeEventListener('click', onDocumentClick, true);
	});

	function isFullscreen(): boolean {
		return Boolean(document.fullscreenElement);
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
	}

	function getParamsStorageKey(): string | undefined {
		return post?.summary?.id ? `post-params:${post.summary.id}` : undefined;
	}

	function onParamsChange(params: ContentParams) {
		postControlContext.setParams(params);
		const key = getParamsStorageKey();
		if (key) {
			try {
				const data = params.map((p) => ({ id: p.id, value: p.value }));
				localStorage.setItem(key, JSON.stringify(data));
			} catch {
				/* storage full or unavailable */
			}
		}
	}

	function loadSavedParams(): ContentParams | undefined {
		const key = getParamsStorageKey();
		if (!key || !post?.params) return undefined;
		try {
			const raw = localStorage.getItem(key);
			if (!raw) return undefined;
			const saved: { id: string; value: unknown }[] = JSON.parse(raw);
			const lookup = new Map(saved.map((s) => [s.id, s.value]));
			return post.params.map((p) =>
				lookup.has(p.id) ? { ...p, value: lookup.get(p.id) as typeof p.value } : p
			);
		} catch {
			return undefined;
		}
	}

	run(() => {
		if (post?.params) {
			const saved = loadSavedParams();
			if (saved) {
				post = { ...post, params: saved };
				postControlContext.setParams(saved);
			}
		}
	});
</script>

<div class="flex flex-1 flex-col h-full" class:experiment-layout={requiresCanvas}>
	{#if !hideHeader}
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
	{/if}

	<div
		bind:this={container}
		class={`flex flex-1 relative ${requiresCanvas ? 'min-h-0' : 'min-h-[80vh]'}`}
	>
		{#if requiresCanvas}
			<canvas bind:this={cnv}>your browser does not support HTML canvas :(</canvas>
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
		<div class="flex-shrink-0 flex flex-col" bind:this={controlArea}>
			{#if areParamsOpen && post && post.params}
				<PostParams params={post.params} {onParamsChange} />
			{/if}
			<PostControlBar
				{toggleFullScreen}
				postId={post?.summary.id}
				hasParams={Boolean(post?.params)}
				{toggleParams}
			/>
		</div>
	{/if}
</div>

<style>
	.experiment-layout {
		height: calc(100dvh - 6.25rem);
	}

	@media (max-width: 639px) {
		.experiment-layout {
			height: calc(100dvh - 4.25rem);
		}
	}
</style>
