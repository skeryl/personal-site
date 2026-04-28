<script lang="ts">
	import { run } from 'svelte/legacy';

	import { type Post, type PostContent, type StageContent } from '@sc/model';
	import { Stage } from 'grraf';
	import { getContext, onMount } from 'svelte';
	import { PlayState, PlayStateChangedEvent, PostControlContext } from '$lib/state/post-control';
	import type { ContentParams } from '$lib/content-params';

	interface Props {
		post?: Post<PostContent> | undefined;
		container?: HTMLDivElement | undefined;
		cnv?: HTMLCanvasElement | undefined;
	}

	let { post = undefined, container = undefined, cnv = undefined }: Props = $props();

	// Stable reference — only created once per mount, not re-created when post.params changes.
	let content: StageContent | undefined = $state(undefined);
	let stage: Stage | undefined;

	const ctx = getContext('post-control') as PostControlContext;

	let playState = ctx.state.playState;

	ctx.onParamsChanged((p) => {
		content?.setParams?.(p);
	});

	ctx.addEventListener('post-play-state-changed', (ev) => {
		playState = (ev as PlayStateChangedEvent).currentPlayState;
		if (playState === PlayState.paused) {
			content?.stop();
		}
		if (playState === PlayState.playing) {
			content?.unpause?.();
		}
		if (playState === PlayState.recording) {
			if (cnv) {
				const stream = cnv.captureStream(24);
				ctx.captureRecording(stream);
			}
		}
	});

	function handleResize() {
		if (stage && container) {
			stage.canvas.height = container.clientHeight;
			stage.canvas.width = container.clientWidth;
		}
	}

	onMount(() => {
		let observer: ResizeObserver | undefined;
		if (container) {
			observer = new ResizeObserver(handleResize);
			observer.observe(container);
		}
		window.addEventListener('resize', handleResize);
		return () => {
			observer?.disconnect();
			window.removeEventListener('resize', handleResize);
		};
	});

	let hasInitialized = false;

	run(() => {
		if (cnv && !hasInitialized) {
			hasInitialized = true;
			if (!content) {
				content = post?.content() as StageContent | undefined;
			}
			stage = new Stage(cnv!);

			stage.canvas.height = container!.clientHeight;
			stage.canvas.width = container!.clientWidth;
			content?.start(stage);
			if (post?.params) {
				content?.setParams?.(post.params);
			}
		}
	});
</script>
