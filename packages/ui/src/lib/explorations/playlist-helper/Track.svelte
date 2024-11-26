<script lang="ts">
	import { formatMillis } from '$lib/explorations/playlist-helper/time-utils.js';
	import { onMount } from 'svelte';
	import type { AudioFeaturesObject, PlaylistTrackObject } from '@sc/spotify';
	import { playlistHelper } from '$lib/explorations/playlist-helper/stores';
	export let track: PlaylistTrackObject | undefined;
	export let playlistId: string | undefined;

	let features: Map<string, AudioFeaturesObject>;

	onMount(() => {
		playlistHelper.subscribeToAudioAnalysis((analysis) => {
			features = analysis;
		});
	});

	$: feature = features && track?.track?.id ? features.get(track.track.id) : undefined;

	function onPlayOut(e: Event) {
		e.stopPropagation();
		if (playlistId) {
			playlistHelper.playOutTrack(track, playlistId, feature!);
		}
	}

	let hoveredOnPlay = false;

	function onMouseOverPlayBtn() {
		hoveredOnPlay = true;
	}

	function onMouseOutPlayBtn() {
		hoveredOnPlay = false;
	}
</script>

<div
	class="flex flex-row content-between justify-between p-2 border-b-2 border-gray-200 hover:bg-neutral-100 w-full"
>
	<div
		class="flex basis-1/4 max-w-[25%]"
		on:mouseenter={onMouseOverPlayBtn}
		on:mouseleave={onMouseOutPlayBtn}
	>
		<div class="flex relative min-w-[40px]">
			<img
				src={track?.track?.album?.images[0].url}
				alt={`image for track ${track?.track?.id}`}
				width="40"
			/>
			<button
				on:mouseenter={(e) => e.stopPropagation()}
				on:click={onPlayOut}
				class={`absolute left-0 w-full h-full bg-emerald-500 opacity-75 self-center place-items-center content-center opacity-100 overflow-hidden ${hoveredOnPlay ? 'max-w-full' : 'max-w-0'} cursor-pointer transition-all`}
			>
				▶️
			</button>
		</div>
		<div class="flex flex-col pl-2 flex-shrink">
			<div class="flex flex-row flex-nowrap whitespace-nowrap text-ellipsis">
				{track?.track?.name ?? ''}
			</div>
			<div
				class="flex flex-row text-sm text-neutral-600 flex-nowrap whitespace-nowrap text-ellipsis"
				style="text-align: start"
			>
				{track?.track?.artists?.map((art) => art.name)?.join(', ') ?? ''}
			</div>
		</div>
	</div>

	<div class="flex flex-row self-center place-items-center">
		<div class="text-sm uppercase text-neutral-500 px-2">ENERGY</div>
		<div>{feature?.energy?.toFixed(2) ?? 'N/A'}</div>
	</div>

	<div class="flex flex-row self-center place-items-center">
		<div class="text-sm uppercase text-neutral-500 px-2">TEMPO</div>
		<div>{feature?.tempo ? Math.round(feature?.tempo) : 'N/A'}</div>
	</div>
	<div class="flex self-center place-items-center">
		{`${formatMillis(track?.track?.duration_ms ?? 0)}`}
	</div>
</div>
