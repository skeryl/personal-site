<script lang="ts">
	import { type Post, type RendererParams, type ExperimentContent3D } from '@sc/model';
	import { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three';
	import { getContext, onMount } from 'svelte';
	import {
		FullScreenChangeEvent,
		PlayState,
		PlayStateChangedEvent,
		PostControlContext
	} from '$lib/state/post-control';

	export let post: Post | undefined = undefined;
	export let cnv: HTMLCanvasElement | undefined = undefined;

	let renderParams: RendererParams | undefined;

	$: content = post?.content() as ExperimentContent3D;

	const res = new Vector2();
	let isMouseActive = false;
	let isRunning = false;

	function handleResize() {
		const canvas = cnv;
		if (!renderParams || !canvas) {
			return;
		}
		const { camera, renderer } = renderParams;
		if (renderer && canvas && canvas.parentElement && camera) {
			const width = (canvas.parentElement || canvas).clientWidth;
			const height = (canvas.parentElement || canvas).clientHeight;
			res.x = width;
			res.y = height;
			canvas.width = width;
			canvas.height = height;
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.setSize(width, height, true);
		}
	}

	function animate() {
		const params = renderParams;
		if (isRunning && params) {
			params.renderer.render(params.scene, params.camera);
			if (content.onRender) {
				content.onRender();
			}
			window.requestAnimationFrame(animate);
		}
	}

	const ctx = getContext('post-control') as PostControlContext;

	let playState = ctx.state.playState;

	ctx.addEventListener('post-play-state-changed', (ev) => {
		playState = (ev as PlayStateChangedEvent).currentPlayState;
		if (playState === PlayState.paused) {
			content?.stop();
		}
		if (playState === PlayState.recording) {
			if (cnv) {
				const stream = cnv.captureStream(24);
				ctx.captureRecording(stream);
			}
		}
	});

	ctx.addEventListener('post-full-screen-changed', (ev) => {
		const { isFullScreen } = ev as FullScreenChangeEvent;
		content?.onFullScreenChange?.(isFullScreen);
	});

	ctx.onParamsChanged((p) => {
		console.log('received params changed event: ', p);
		content?.setParams?.(p);
	});

	onMount(() => {
		return () => {
			content?.stop();
		};
	});

	$: if (cnv) {
		if (!isRunning) {
			const canvas = cnv!;
			const renderer = new WebGLRenderer({
				canvas: canvas,
				alpha: true,
				antialias: true
			});
			renderer.shadowMap.enabled = true;

			const scene = new Scene();
			const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

			renderParams = {
				scene,
				camera,
				renderer,
				container: cnv.parentElement as HTMLElement
			};

			window.addEventListener('resize', handleResize);
			handleResize();
			content.start(renderParams);
			isRunning = true;
			animate();
			setTimeout(() => handleResize(), 10);
		}
	}
</script>
