import { moodStore } from '$lib/explorations/playlist-helper/stores/mood';
import { readable, writable } from 'svelte/store';
import {
	type AudioFeaturesObject,
	ClientInitState,
	type CurrentlyPlayingContextObject,
	type DeviceObject,
	type ErrorObject,
	type ManyAudioFeatures,
	type ManyDevices,
	type OneAudioFeatures,
	type PagingPlaylistObject,
	type PagingPlaylistTrackObject,
	type PlaylistOrderUpdateRequest,
	type PlaylistSnapshotId,
	type PlaylistTrackObject,
	type SimplifiedPlaylistObject,
	SpotifyClient
} from '@sc/spotify';
import {
	type ContextUpdateEventHandler,
	CurrentTrackPoller
} from '$lib/explorations/playlist-helper/visualization/CurrentTrackPoller';

export const ssr = false;

export interface PlaylistMood {
	playlist?: { id: string; name: string };
	color?: string;
	sequence: number;
}

export interface AsyncResult<T> {
	data: T;
	loading: boolean;
	fetched: boolean;
	error?: any;
}

const CACHE_KEY_ROOT = 'shanes-playlist-helper';

enum CACHE_KEYS {
	UserPlaylists = 'user-playlists',
	TrackFeatures = 'track-features'
}

type CachedTrackFeatures = Record<string, AudioFeaturesObject>;

const CACHE_KEY_PLAYLISTS = 'user-playlists';
const CACHE_KEY_TRACK_FEATURES = 'track-features';

function cacheKey(key: CACHE_KEYS) {
	return `${CACHE_KEY_ROOT}|${key}`;
}
function getCachedObject<T>(key: CACHE_KEYS): T | undefined {
	const item = window.localStorage.getItem(cacheKey(key));
	if (item) {
		return JSON.parse(item) as T;
	}
	return undefined;
}

function storeCachedObject<T>(key: CACHE_KEYS, item: T | undefined) {
	window.localStorage.setItem(cacheKey(key), JSON.stringify(item));
}

export function createPlaylistHelper() {
	const client = new SpotifyClient();
	const { subscribe: subscribeToClientState, set: setClientState } = writable(
		ClientInitState.UNINITIALIZED
	);

	const playlistTracksInit = new Map<string, PlaylistTrackObject[]>();
	const { subscribe: subscribeToPlaylistDetails, update: updatePlaylistDetails } =
		writable(playlistTracksInit);

	let playlistTracks = playlistTracksInit;

	let moods: PlaylistMood[] = [];

	async function refreshToken() {
		const initRes = await client.refreshToken();
		console.log('init res after refresh: ', initRes);
		if (initRes === undefined) {
			await client.init();
		} else {
			setClientState(initRes);
		}
	}

	const playlists = readable<AsyncResult<SimplifiedPlaylistObject[]>>(
		{ data: [], fetched: false, loading: false },
		function init(set) {
			const cachedPlaylists = getCachedObject<SimplifiedPlaylistObject[]>(CACHE_KEYS.UserPlaylists);
			if (cachedPlaylists) {
				console.log('found cached playlists.');
				set({
					data: cachedPlaylists,
					fetched: true,
					loading: false
				});
			} else {
				console.log('fetching playlists from Spotify');
				subscribeToClientState(async (clientState) => {
					if (clientState === ClientInitState.AUTHENTICATED) {
						const pagedPlaylists = await client.getPlaylists();
						if ((pagedPlaylists as ErrorObject).status > 200) {
							await refreshToken();
							set({
								error: pagedPlaylists as ErrorObject,
								data: [],
								fetched: true,
								loading: false
							});
							return;
						}
						set({
							data: (pagedPlaylists as PagingPlaylistObject).items ?? [],
							fetched: true,
							loading: false
						});
					}
				});
			}

			return function clear() {
				console.log('on unmount.');
			};
		}
	);

	const devices = readable<AsyncResult<DeviceObject[]>>(
		{ data: [], fetched: false, loading: false },
		function init(set) {
			set({ fetched: true, loading: true, data: [] });
			client.getPlaybackDevices().then((deviceResponse) => {
				const manyDevices = deviceResponse as ManyDevices;
				if (manyDevices.devices) {
					set({ fetched: true, loading: false, data: manyDevices.devices });
				} else {
					console.error('Error fetching devices: ', manyDevices);
					set({ fetched: true, loading: false, data: [], error: manyDevices });
				}
			});
		}
	);

	async function init() {
		console.log('initializing client...');
		const initState = await client.init();
		setClientState(initState);
		console.log('client initialized to state: ', initState);
		if (initState === ClientInitState.TOKEN_EXPIRED) {
			await refreshToken();
		}

		console.log('hydrating from cache...');
		const trackFeatures = getCachedObject<CachedTrackFeatures>(CACHE_KEYS.TrackFeatures);
		if (trackFeatures) {
			updateAudioFeatures(Object.values(trackFeatures));
		}

		subscribeToPlaylistDetails((p) => {
			playlistTracks = p;
		});

		moodStore.moods.subscribe((mds) => {
			moods = mds;
		});

		console.log('thirst quenced.');
	}

	function updateAudioFeatures(audioFeatures: AudioFeaturesObject[]) {
		updateAudioAnalysis((aa) => {
			audioFeatures.forEach((f) => {
				if (f.id) {
					aa.set(f.id, f);
				}
			});
			return aa;
		});
	}

	async function loadTrackAudioAnalysis(tracks: PlaylistTrackObject[]) {
		const trackFeatures = getCachedObject<CachedTrackFeatures>(CACHE_KEYS.TrackFeatures) ?? {};
		const trackIds = tracks
			.map((track) => {
				return track?.track?.id;
			})
			.filter((trackId: string | undefined) => {
				if (trackId) {
					// if not in cache, fetch it
					return !(trackId in trackFeatures);
				}
				return false;
			}) as string[];

		if (trackIds.length > 0) {
			const audioAnalysis = (await client.getAudioAnalysisForTracks(trackIds)) as ManyAudioFeatures;
			const audioFeatures = audioAnalysis.audio_features;
			if (audioFeatures) {
				updateAudioFeatures(audioFeatures);
			}

			storeCachedObject<CachedTrackFeatures>(CACHE_KEYS.TrackFeatures, {
				...trackFeatures,
				...audioFeatures.reduce((obj, feature) => ({ ...obj, [feature.id ?? '']: feature }), {})
			} as CachedTrackFeatures);
		}

		console.log(
			`loaded analysis for ${trackIds.length} tracks (${tracks.length - trackIds.length} found in cache)`
		);
	}

	async function loadPlaylistDetail(id: string) {
		const playlistDetails = await client.getPlaylistTracks(id);

		const playlistTracks = (playlistDetails as PagingPlaylistTrackObject).items;

		if (playlistTracks) {
			updatePlaylistDetails((pd) => {
				pd.set(id, playlistTracks);
				return pd;
			});
			await loadTrackAudioAnalysis(playlistTracks);
		}
	}

	const { subscribe: subscribeToAudioAnalysis, update: updateAudioAnalysis } = writable(
		new Map<string, AudioFeaturesObject>()
	);

	function isLastTrack(playlistId: string, track: PlaylistTrackObject): boolean {
		const plTracks = playlistTracks.get(playlistId);
		if (plTracks) {
			return plTracks.findIndex((tr) => tr.track?.id === track.track?.id) === plTracks.length - 1;
		}
		return false;
	}

	function getNextPlaylistFirstTrack(playlistId: string): string | undefined {
		const thisIx = moods.findIndex((m) => m.playlist?.id === playlistId);
		const nextPlaylistId = moods[thisIx + 1]?.playlist?.id;

		const nextPlTracks = nextPlaylistId ? playlistTracks.get(nextPlaylistId) : undefined;
		return nextPlTracks?.[0]?.track?.id;
	}

	async function playOutTrack(
		track: PlaylistTrackObject | undefined,
		playlistId: string,
		audioFeatures: AudioFeaturesObject,
		crossFade: number = 6
	) {
		if (!track) return;
		const requestObj = {
			context_uri: `spotify:playlist:${playlistId}`,
			offset: { uri: track.track?.uri },
			position_ms: audioFeatures.duration_ms ? audioFeatures.duration_ms - crossFade * 2000 : 0
		};

		const devices = await client.getPlaybackDevices();
		const deviceId = (devices as ManyDevices).devices.find((device) => device.id)?.id ?? '';

		if (isLastTrack(playlistId, track)) {
			const nextTrackId = getNextPlaylistFirstTrack(playlistId);
			if (nextTrackId) {
				// add next playlist to queue
				await client.addToQueue(`spotify:track:${nextTrackId}`, deviceId);
			}
		}

		await client.setPlaybackState(deviceId, requestObj);
	}

	const poller = new CurrentTrackPoller(client, async () => {
		await playlistHelper.refreshToken();
	});

	async function reorderPlaylist(
		playlistId: string,
		request: PlaylistOrderUpdateRequest
	): Promise<string | undefined> {
		const result = await client.updatePlaylistOrder(playlistId, request);
		return (result as PlaylistSnapshotId).snapshot_id;
	}

	function subscribeToPlaybackContext(handler: ContextUpdateEventHandler) {
		if (!poller.isStarted) {
			poller.start();
		}
		return poller.subscribe(handler);
	}

	function unsubscribeFromPlaybackContext(listener: EventListener | undefined) {
		if (listener) {
			poller.unsubscribe(listener);
		}
		poller.stop();
	}

	return {
		init,
		subscribeToClientState,
		playlists,
		loadPlaylistDetail,
		subscribeToPlaylistDetails,
		subscribeToAudioAnalysis,
		playOutTrack,
		reorderPlaylist,
		devices,
		subscribeToPlaybackContext,
		unsubscribeFromPlaybackContext,
		refreshToken
	};
}

// export type PlaybackContextUpdate = (context: CurrentlyPlayingContextObject, audioAnalysis: OneAudioFeatures) => void

export const playlistHelper = createPlaylistHelper();
