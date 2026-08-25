<script lang="ts">
	import { run } from 'svelte/legacy';

	import videos from '$lib/assets/videos/posts/index.js';
	import { onMount } from 'svelte';
	import type { PostSummary } from '@sc/model';

	const videoSources = Object.entries(videos);
	interface Props {
		selectedPost: PostSummary | undefined;
	}

	let { selectedPost }: Props = $props();
	let currentPost: string | undefined;

	let vid: HTMLVideoElement | undefined = $state();

	run(() => {
		if (selectedPost && currentPost !== selectedPost.id && vid) {
			const src = videos[selectedPost.id];
			if (!src) {
				// Post without a preview video: clear the player instead of
				// crashing the reactive flush (which broke card hover states).
				vid.pause();
				Array.from(vid.querySelectorAll('source')).forEach((el) => el.remove());
				vid.load();
				return;
			}
			console.log('changing video source...');
			const sources = Array.from(vid.querySelectorAll('source'));
			sources.forEach((el) => el.remove());
			vid.load();

			const source = document.createElement('source');
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
		}
	});

	onMount(() => {
		vid?.load();
	});
</script>

<video
	bind:this={vid}
	autoplay
	loop
	muted
	id="post-preview-video"
	class="fixed inset-0 -z-50 opacity-45 block object-cover"
	style="width: 100%; height: 100%;"
>
	<!--{#each videoSources as [postId, videoSrc]}
        <source src={videoSrc} id={`post-video-src:${postId}`} type="video/webm">
    {/each}-->
</video>
