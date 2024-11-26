<script lang="ts">
	import { playlistHelper } from '$lib/explorations/playlist-helper/stores';
	import PlaylistMood from '$lib/explorations/playlist-helper/PlaylistMood.svelte';
	import { moodStore } from '$lib/explorations/playlist-helper/stores/mood';
	import { onMount } from 'svelte';
	import { formatMillis } from '$lib/explorations/playlist-helper/time-utils.js';
	import type { DeviceObject, PlaylistTrackObject } from '@sc/spotify';
	import Track from '$lib/explorations/playlist-helper/Track.svelte';
	import Selector from '$lib/components/input/Selector.svelte';
	import {type AutocompleteOption, Tab, TabGroup} from "@skeletonlabs/skeleton";
	import type { Item } from 'svelte-dnd-action';
	import TrackVisualizer from '$lib/explorations/playlist-helper/visualization/TrackVisualizer.svelte';

	const moodsFromStore = moodStore.moods;

	const PLAYLIST_IHCUS = '3fuOvHHAEkAf7wEpXCzdHq';

	let totalRuntime = 0;

	let missingTracks: PlaylistTrackObject[] = [];
	let duplicateTracks: PlaylistTrackObject[] = [];
	let devices: DeviceObject[] = [];

	function trackKey(track: PlaylistTrackObject): string {
		return `${track?.track?.name}|${track.track?.album?.name}|${track.track?.artists?.[0]}`;
	}

	function findMissingTracks(mainPlaylistId: string, details: Map<string, PlaylistTrackObject[]>) {
		const mainTracks = (details.get(mainPlaylistId) as PlaylistTrackObject[]) ?? [];

		const mainTrackKeys = new Set<string>(
			mainTracks.map((tr) => trackKey(tr)).filter(Boolean) as string[]
		);

		const derivedTrackList = new Set<string>(
			Array.from(details.entries())
				.filter(([id]) => id !== mainPlaylistId)
				.flatMap(([id, tracks]) => tracks.map((t) => trackKey(t))) as string[]
		);

		derivedTrackList.forEach((t) => mainTrackKeys.delete(t));

		missingTracks = mainTracks.filter((track) => mainTrackKeys.has(trackKey(track)));
		console.log('missing: ', missingTracks);
	}

	function findDuplicateTracks(details: Map<string, PlaylistTrackObject[]>) {
		const allTracks = Array.from(details.values()).flat();

		const trackKeys = new Set<string>();

		const duplicates = new Set<PlaylistTrackObject>();

		allTracks.forEach((t) => {
			const key = trackKey(t);
			if (trackKeys.has(key)) {
				duplicates.add(t);
			}
			trackKeys.add(key);
		});

		duplicateTracks = Array.from(duplicates.values());
	}

	onMount(async () => {
		// load the "main" playlist detail
		// await playlistHelper.loadPlaylistDetail(PLAYLIST_IHCUS);

		playlistHelper.subscribeToPlaylistDetails((details) => {
			totalRuntime = Array.from(details.entries())
				.filter(([id]) => id !== PLAYLIST_IHCUS)
				.reduce((res, [id, tracks]) => {
					return (
						res +
						tracks.reduce((r, track) => {
							return r + (track?.track?.duration_ms ?? 0);
						}, 0)
					);
				}, 0);
			// findMissingTracks(PLAYLIST_IHCUS, details);
			// findDuplicateTracks(details);
		});

		playlistHelper.devices.subscribe((dvcs) => {
			devices = dvcs.data;
		});
	});

	let deviceItems:  AutocompleteOption<string>[];

	$: deviceItems = devices?.map((dev) => ({ value: dev.id ?? '', label: dev.name ?? '' }));
	$: activeDevice = devices.find((dev) => dev.is_active);
	$: activeDeviceItem = deviceItems.find((item) => item.value === activeDevice?.id);

	let selectedDeviceItem: AutocompleteOption<string> | undefined = activeDeviceItem ?? deviceItems?.[0];

	function onDeviceChange(item: AutocompleteOption<string> | undefined) {
		selectedDeviceItem = item;
	}

	/*function onNewMood() {
		moodStore.createNewMood();
	}

	function compareWithMain() {}*/

	const tabs: Item[] = [
		{
			id: 'playlist-manager',
			name: 'Playlist Manager'
		},
		{
			id: 'track-visualizer',
			name: 'Track Visualizer'
		}
	];

	let selectedTabId: number = 0;

	function selectTab(id: number) {
		selectedTabId = id;
	}
</script>

<div class="flex flex-col w-full">
	<!--tabs -->
	<TabGroup >
		<Tab bind:group={selectedTabId} name="Playlist Manager" value={0}>
			Playlist Manager
		</Tab>
		<Tab bind:group={selectedTabId} value={1} name="Track Visualizer">
			Track Visualizer
		</Tab>
		<svelte:fragment slot="panel">
			{#if selectedTabId === 0}
				<div>
					<div class="flex flex-col pt-1">
						<div class="flex flex-row justify-between">
							<h4>Harvest of Shadows / I heard creaking upstairs</h4>
							<div>
								<Selector items={deviceItems} value={selectedDeviceItem?.id} onChange={onDeviceChange}/>
							</div>
							<div>
								Total runtime: {formatMillis(totalRuntime)}
							</div>
						</div>

						<div class="border-2 border-orange-300 p-1 px-4 rounded hidden">
							<h5>Missing tracks</h5>
							<div class="flex flex-col overflow-hidden">
								{#each missingTracks as track}
									<Track {track} playlistId={undefined} />
								{/each}
							</div>
						</div>

						<div class="border-2 border-orange-300 p-1 px-4 rounded hidden">
							<h5>Duplicate tracks</h5>
							<div class="flex flex-col overflow-hidden">
								{#each duplicateTracks as track}
									<Track {track} playlistId={undefined} />
								{/each}
							</div>
						</div>

						<div class="flex flex-col">
							{#each $moodsFromStore as mood}
								<PlaylistMood {mood} />
							{/each}
						</div>
						<!--<div class="flex flex-col">
                        <button on:click={onNewMood} class="rounded p-2 border-2 border-green-400 hover:bg-green-100">➕Add new mood</button>
                    </div>-->
					</div>
				</div>
			{:else if selectedTabId === 1}
				<div>
					<TrackVisualizer />
				</div>
			{/if}
		</svelte:fragment>
	</TabGroup>
</div>
