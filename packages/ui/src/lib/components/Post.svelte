<script lang="ts">
	import { setContext } from 'svelte';
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

	export let post: Post | undefined;
	export let hideHeader: boolean = false;

	$: title = post?.summary?.title;
	$: date = post?.summary.timestamp;
	$: requiresCanvas =
		post?.summary?.type === PostType.experiment || post?.summary?.type === PostType.experiment3d;

	let container: HTMLDivElement | undefined = undefined;
	let cnv: HTMLCanvasElement | undefined = undefined;
	let areParamsOpen = false;

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

	function onParamsChange(params: ContentParams) {
		console.log('params changed in post!');
		postControlContext.setParams(params);
	}
</script>

<div class="flex flex-1 flex-col h-full">
	{#if !hideHeader}
		<div class="flex flex-row items-baseline">
			<h1 class="flex-1">{title}</h1>
			<div>
				{date?.toLocaleDateString()}
			</div>
		</div>
	{/if}

	<div bind:this={container} class="flex flex-1 relative min-h-[80vh]">
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

	{#if areParamsOpen && post && post.params}
		<PostParams params={post.params} {onParamsChange} />
	{/if}

	{#if requiresCanvas}
		<PostControlBar
			{toggleFullScreen}
			postId={post?.summary.id}
			hasParams={Boolean(post?.params)}
			{toggleParams}
		/>
	{/if}
</div>
