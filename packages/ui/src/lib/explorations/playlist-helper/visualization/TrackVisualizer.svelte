<script lang="ts">
	import { playlistHelper } from '$lib/explorations/playlist-helper/stores';
	import type { AudioFeaturesObject, CurrentlyPlayingContextObject } from '@sc/spotify';
	import PostComponent from '$lib/components/Post.svelte';
	import { type Post, PostType } from '@sc/model';
	import { TrackVizContent } from '$lib/explorations/playlist-helper/visualization/TrackVizPost';
	import { onMount } from 'svelte';

	let context: CurrentlyPlayingContextObject | undefined;
	let currentAnalysis: AudioFeaturesObject | undefined;
	let audioAnalyses: Map<string, AudioFeaturesObject> = new Map();

	const trackVizContent = new TrackVizContent();
	let playbackListener: EventListener | undefined;

	$: {
		playlistHelper.subscribeToAudioAnalysis((analysis: Map<string, AudioFeaturesObject>) => {
			audioAnalyses = analysis;
		});
	}

	onMount(() => {
		console.log("subscribed to playback context!");
		playbackListener = playlistHelper.subscribeToPlaybackContext((ctx) => {
			context = ctx;
			currentAnalysis = audioAnalyses.get(ctx?.item?.id ?? '');
			trackVizContent.setContext(ctx, currentAnalysis);
		});

		return () => {

			console.log("unsubscribed from playback context <3");
			playlistHelper.unsubscribeFromPlaybackContext(playbackListener)
		};
	});

	const trackVisualizerPost: Post = {
		summary: {
			timestamp: new Date(),
			title: 'Track visualizer',
			type: PostType.experiment3d,
			id: 'track-visualizer',
			tags: []
		},
		params: [],
		content: () => trackVizContent
	};
</script>

<div>
	<div>
		{context?.item?.name ?? '(no track is playing at the moment)'}
	</div>
	<PostComponent post={trackVisualizerPost} hideHeader/>
</div>
