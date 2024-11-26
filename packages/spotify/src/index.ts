import { components, operations } from "../src-gen/spotify-schema";

export * from "../src-gen/spotify-schema.d";
export { ClientInitState, loginWithSpotifyClick } from "./auth";

export { type PlaylistOrderUpdateRequest } from "./spotify-client";

export type Fetcher = typeof window.fetch;

export type PagedPlaylists = components["responses"]["PagedPlaylists"];
export type PagingPlaylistObject =
  components["schemas"]["PagingPlaylistObject"];

export type OnePrivateUser = components["responses"]["OnePrivateUser"];
export type PrivateUserObject = components["schemas"]["PrivateUserObject"];

export type OneAudioAnalysis = components["responses"]["OneAudioAnalysis"];
export type AudioAnalysisObject = components["schemas"]["AudioAnalysisObject"];

export type OneAudioFeatures =
  components["responses"]["OneAudioFeatures"]["content"]["application/json"];
export type ManyAudioFeatures =
  components["responses"]["ManyAudioFeatures"]["content"]["application/json"];

export type AudioFeaturesObject = components["schemas"]["AudioFeaturesObject"];

export type ErrorObject = components["schemas"]["ErrorObject"];

export type StartPlaybackRequest = NonNullable<
  operations["start-a-users-playback"]["requestBody"]
>["content"]["application/json"];

export type ManyDevices =
  components["responses"]["ManyDevices"]["content"]["application/json"];
export type DeviceObject = components["schemas"]["DeviceObject"];

export type OneCurrentlyPlayingTrack =
  components["responses"]["OneCurrentlyPlayingTrack"];
export type CurrentlyPlayingContextObject =
  components["schemas"]["CurrentlyPlayingContextObject"];

export type PagingPlaylistTrackObject =
  components["schemas"]["PagingPlaylistTrackObject"];

export type PlaylistTrackObject = components["schemas"]["PlaylistTrackObject"];

export type UpdatePlaylistTracks = NonNullable<
  operations["reorder-or-replace-playlists-tracks"]["requestBody"]
>["content"]["application/json"];

export type PlaylistSnapshotId =
  components["responses"]["PlaylistSnapshotId"]["content"]["application/json"];

export type CreatePlaylistRequest = NonNullable<
  operations["create-playlist"]["requestBody"]
>["content"]["application/json"];

export interface ApiErrorResponse {
  error: ErrorObject;
}

export type SimplifiedPlaylistObject =
  components["schemas"]["SimplifiedPlaylistObject"];
