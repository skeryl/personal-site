<script lang="ts">
	import { playlistHelper, type PlaylistMood } from '$lib/explorations/playlist-helper/stores';
	import type {
		PlaylistTrackObject,
		PlaylistOrderUpdateRequest,
		SimplifiedPlaylistObject,
		AudioFeaturesObject
	} from '@sc/spotify';
	import Track from '$lib/explorations/playlist-helper/Track.svelte';
	import { flip } from 'svelte/animate';
	import { dndzone, type Item } from 'svelte-dnd-action';
	import type { AsyncResult } from '$lib/explorations/playlist-helper/stores.js';
	import { formatMillis } from '$lib/explorations/playlist-helper/time-utils.js';

	export let mood: PlaylistMood;

	let features: Map<string, AudioFeaturesObject>;

	$: {
		playlistHelper.subscribeToAudioAnalysis((analysis) => {
			features = analysis;
		});
	}

	const flipDurationMs = 300;

	let playlistTracks: PlaylistTrackObject[] = [];
	let playlistInfo: SimplifiedPlaylistObject | undefined;
	let lastPlaylistSnapshot: string | undefined;
	let loading = false;
	let expanded = false;

	function onToggleExpansion() {
		expanded = !expanded;
	}

	function refreshPlaylist(e: Event) {
		e.stopPropagation();
		loading = true;
		const playlistId = mood?.playlist?.id;
		if (playlistId) {
			playlistHelper.loadPlaylistDetail(playlistId);
		}
	}

	function getReorderRequest(
		playlistTracks: PlaylistTrackObject[],
		trackItems: Item[]
	): PlaylistOrderUpdateRequest | undefined {
		const req: PlaylistOrderUpdateRequest = {
			insert_before: 0,
			range_length: 1,
			range_start: 0,
			snapshot_id: snapshotId
		};

		if (trackItems.length !== playlistTracks.length) {
			console.error(
				"Something's wrong. Reordered tracks should be the same length as the original playlist."
			);
			return undefined;
		}

		for (let ix = 0; ix < trackItems.length; ) {
			const newOrderItem = trackItems[ix];
			const prevOrderItem = playlistTracks[ix];

			if (newOrderItem.name === prevOrderItem.track?.id) {
				ix++;
			} else {
				req.insert_before = ix;
				req.range_start = playlistTracks.findIndex((tr) => tr?.track?.id === newOrderItem.name);
				return req;
			}
		}
		return req;
	}

	$: {
		const playlistId = mood?.playlist?.id;
		if (playlistId) {
			playlistHelper.loadPlaylistDetail(playlistId);

			playlistHelper.subscribeToPlaylistDetails((details) => {
				playlistTracks = details.get(playlistId) ?? [];
				loading = false;
			});
		}
	}
	$: {
		playlistHelper.playlists.subscribe((playlists: AsyncResult<SimplifiedPlaylistObject[]>) => {
			playlistInfo = playlists.data.find((pl) => pl.id === mood?.playlist?.id);
		});
	}

	$: trackItems = playlistTracks.map(
		(tr) => ({ id: `${tr.track?.id}|${tr.added_at ?? ''}`, name: tr.track?.id }) as Item
	);

	type DndEvent = { detail: { items: Item[] } };

	function handleDndConsider(e: DndEvent) {
		trackItems = e.detail.items;
	}

	$: snapshotId = lastPlaylistSnapshot ?? playlistInfo?.snapshot_id;

	async function handleDndFinalize(e: DndEvent) {
		console.log('on dnd finalize!');
		trackItems = e.detail.items;
		const request = getReorderRequest(playlistTracks, e.detail.items);
		loading = true;
		if (request && playlistInfo?.id) {
			lastPlaylistSnapshot = await playlistHelper.reorderPlaylist(playlistInfo.id, request);
			await playlistHelper.loadPlaylistDetail(playlistInfo.id);
		}
	}

	interface MoodStats {
		energy: number;
		durationMs: number;
		tempo: number;
	}

	$: moodTotals = playlistTracks.reduce(
		(result: MoodStats, track: PlaylistTrackObject) => {
			const feature = features.get(track.track?.id ?? '');
			return {
				energy: result.energy + (feature?.energy ?? 0),
				durationMs: result.durationMs + (feature?.duration_ms ?? 0),
				tempo: result.tempo + (feature?.tempo ?? 0)
			};
		},
		{
			energy: 0,
			durationMs: 0,
			tempo: 0
		}
	);

	$: moodStats = {
		energy: moodTotals.energy / playlistTracks.length,
		tempo: moodTotals.tempo / playlistTracks.length,
		durationMs: moodTotals.durationMs
	};
</script>

<button
	class={`flex flex-col my-4 border-2 border-gray-300 rounded p-1 w-full`}
	on:click={onToggleExpansion}
>
	<div
		class={`flex flex-row w-full rounded p-1 sticky top-4 z-10 justify-between`}
		style={`background-color: ${mood?.color}`}
	>
		<div class="flex flex-row basis-1/4 self-center items-center">
			<h5 class="flex text-sm">{mood?.playlist?.name ?? `Mood ${mood.sequence}`}</h5>
			<div class="ml-2">
				<button
					class="border-2 rounded px-2 border-neutral-950 hover:bg-emerald-100"
					on:click={refreshPlaylist}>↺ refresh</button
				>
			</div>
		</div>
		<div class="flex flex-row self-center items-center">
			<div class="text-sm uppercase text-neutral-500 mr-1">Energy</div>
			<div>{moodStats.energy.toFixed(2)}</div>
		</div>
		<div class="flex flex-row self-center items-center">
			<div class="text-sm uppercase text-neutral-500 mr-1">Tempo</div>
			<div>{Math.round(moodStats.tempo)}</div>
		</div>
		<div class="flex flex-row pr-2">
			<!--<div class="text-sm uppercase text-neutral-500 mr-1">Duration</div>-->
			<div>{formatMillis(moodStats.durationMs)}</div>
		</div>
	</div>
	<div
		class={`w-full overflow-hidden ${expanded ? 'max-h-full' : 'max-h-0'} transition-all duration-200`}
		use:dndzone={{ items: trackItems, flipDurationMs }}
		on:consider={handleDndConsider}
		on:finalize={handleDndFinalize}
	>
		{#each trackItems as track (track.id)}
			<div animate:flip={{ duration: flipDurationMs }}>
				<Track
					track={playlistTracks.find((tr) => tr.track?.id === track.name)}
					playlistId={mood?.playlist?.id}
				/>
			</div>
		{/each}
	</div>
</button>
