import { init, refreshToken } from "./auth";
import {
  ApiErrorResponse,
  AudioAnalysisObject,
  CurrentlyPlayingContextObject,
  ErrorObject,
  Fetcher,
  ManyAudioFeatures,
  ManyDevices,
  PagingPlaylistObject,
  PagingPlaylistTrackObject,
  PlaylistSnapshotId,
  PrivateUserObject,
  StartPlaybackRequest,
  UpdatePlaylistTracks,
} from "./index";

function spotUrl(uri: string): string {
  return `https://api.spotify.com${uri}`;
}

async function handleResponse<T>(res: Response) {
  const response: T | ApiErrorResponse =
    res.status === 204 ? (undefined as T) : await res.json();
  if ((response as ApiErrorResponse).error) {
    return (response as ApiErrorResponse).error;
  }
  return response as T;
}

export type PlaylistOrderUpdateRequest = NonNullable<
  Pick<
    UpdatePlaylistTracks,
    "range_start" | "insert_before" | "range_length" | "snapshot_id"
  >
>;

export class SpotifyClient {
  private accessToken: string | undefined;
  private readonly fetch: Fetcher;
  private isInitialized = false;

  public get initialized(): boolean {
    return this.isInitialized;
  }

  constructor(private readonly fetcherFn: () => Fetcher = () => window.fetch) {
    this.fetch = fetcherFn();
  }

  public async init() {
    return init(this);
  }

  public async refreshToken() {
    const newToken = await refreshToken();
    if (newToken == null) {
      return this.init();
    }
    this.setToken(newToken);
    return undefined;
  }

  public async getCurrentProfile(): Promise<PrivateUserObject | ErrorObject> {
    return this.fetch(spotUrl("/v1/me"), this.getBaseRequestInit()).then(
      handleResponse<PrivateUserObject>,
    );
  }

  public async getPlaylists(): Promise<PagingPlaylistObject | ErrorObject> {
    return this.fetch(
      spotUrl("/v1/me/playlists?offset=0&limit=50"),
      this.getBaseRequestInit(),
    ).then(handleResponse<PagingPlaylistObject>);
  }

  public async getPlaylistTracks(
    id: string,
  ): Promise<PagingPlaylistTrackObject | ErrorObject> {
    return this.fetch(
      spotUrl(`/v1/playlists/${id}/tracks`),
      this.getBaseRequestInit(),
    ).then(handleResponse<PagingPlaylistTrackObject>);
  }

  public async getAudioAnalysisForTrack(
    trackId: string,
  ): Promise<AudioAnalysisObject | ErrorObject> {
    return this.fetch(
      spotUrl(`/v1/audio-analysis/${trackId}`),
      this.getBaseRequestInit(),
    ).then(handleResponse<AudioAnalysisObject>);
  }

  public async getAudioAnalysisForTracks(
    trackIds: string[],
  ): Promise<ManyAudioFeatures | ErrorObject> {
    return this.fetch(
      spotUrl(`/v1/audio-features?ids=${trackIds.join(",")}`),
      this.getBaseRequestInit(),
    ).then(handleResponse<ManyAudioFeatures>);
  }

  public async getPlaybackDevices(): Promise<ManyDevices | ErrorObject> {
    return await this.fetch(
      spotUrl("/v1/me/player/devices"),
      this.getBaseRequestInit(),
    ).then(handleResponse<ManyDevices>);
  }

  public async setPlaybackState(
    deviceId: string,
    playbackStateReq: StartPlaybackRequest,
  ): Promise<void | ErrorObject> {
    await this.fetch(
      spotUrl(`/v1/me/player/play?device_id=${deviceId}`),
      this.getBaseRequestInit(playbackStateReq, "PUT"),
    ).then(handleResponse<void>);
  }

  public async addToQueue(
    uri: string,
    deviceId?: string,
  ): Promise<void | ErrorObject> {
    await this.fetch(
      spotUrl(
        `/v1/me/player/queue?uri=${encodeURIComponent(uri)}${deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : ""}`,
      ),
      this.getBaseRequestInit(undefined, "POST"),
    ).then(handleResponse<void>);
  }

  public async getCurrentlyPlaying(): Promise<
    CurrentlyPlayingContextObject | ErrorObject
  > {
    return await this.fetch(
      spotUrl("/v1/me/player/currently-playing"),
      this.getBaseRequestInit(),
    ).then(handleResponse<CurrentlyPlayingContextObject>);
  }

  public async updatePlaylistOrder(
    playlistId: string,
    request: PlaylistOrderUpdateRequest,
  ): Promise<PlaylistSnapshotId | ErrorObject> {
    return this.fetch(
      spotUrl(`/v1/playlists/${playlistId}/tracks`),
      this.getBaseRequestInit(request, "PUT"),
    ).then(handleResponse<PlaylistSnapshotId>);
  }

  private getBaseRequestInit(
    body: any = undefined,
    method: "GET" | "PUT" | "POST" = "GET",
  ): RequestInit {
    return {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: this.getHeaders(),
    };
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  public setToken(token: string) {
    this.accessToken = token;
    this.isInitialized = true;
    console.log("client initialized.");
  }
}
