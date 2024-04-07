<script lang="ts">
	import { type Post, type PostContent, type StageContent } from '@sc/model';
	import { Stage } from 'grraf';
	import { getContext } from 'svelte';
	import { PlayState, PlayStateChangedEvent, PostControlContext } from '$lib/state/post-control';

	export let post: Post<PostContent> | undefined = undefined;
	export let container: HTMLDivElement | undefined = undefined;
	export let cnv: HTMLCanvasElement | undefined = undefined;

	$: content = post?.content() as StageContent | undefined;

	const ctx = getContext('post-control') as PostControlContext;

	let playState = ctx.state.playState;

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

	$: if (cnv) {
		const stage: Stage | undefined = new Stage(cnv!);

		stage.canvas.height = container!.clientHeight;
		stage.canvas.width = container!.clientWidth;
		content?.start(stage);
	}
</script>
