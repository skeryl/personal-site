<script lang="ts">
	import { run } from 'svelte/legacy';

	import { type Post, type RendererParams, type ExperimentContent3D } from '@sc/model';
	import { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three';
	import { getContext, onMount } from 'svelte';
	import {
		FullScreenChangeEvent,
		PlayState,
		PlayStateChangedEvent,
		PostControlContext
	} from '$lib/state/post-control';

	interface Props {
		post?: Post | undefined;
		cnv?: HTMLCanvasElement | undefined;
	}

	let { post = undefined, cnv = undefined }: Props = $props();

	let renderParams: RendererParams | undefined = $state();

	let content = $derived(post?.content() as ExperimentContent3D);

	const res = new Vector2();
	let isMouseActive = false;
	let isRunning = $state(false);

	function handleResize() {
		const canvas = cnv;
		if (!renderParams || !canvas) {
			return;
		}
		const { camera, renderer } = renderParams;
		const parent = canvas.parentElement;
		if (renderer && canvas && parent && camera) {
			const width = parent.clientWidth;
			const height = parent.clientHeight;
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
		/* Delay resize to let the browser finish the fullscreen transition */
		setTimeout(() => handleResize(), 100);
	});

	ctx.onParamsChanged((p) => {
		content?.setParams?.(p);
	});

	function onFullscreenChange() {
		/* Handles browser-native fullscreen exit (Escape key) which bypasses Post.svelte */
		setTimeout(() => handleResize(), 100);
	}

	onMount(() => {
		document.addEventListener('fullscreenchange', onFullscreenChange);

		let observer: ResizeObserver | undefined;
		const parent = cnv?.parentElement;
		if (parent) {
			observer = new ResizeObserver(handleResize);
			observer.observe(parent);
		}

		return () => {
			document.removeEventListener('fullscreenchange', onFullscreenChange);
			observer?.disconnect();
			content?.stop();
		};
	});

	run(() => {
		if (cnv) {
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

				handleResize();
				content.start(renderParams);
				isRunning = true;
				animate();
				setTimeout(() => handleResize(), 10);
			}
		}
	});
</script>
