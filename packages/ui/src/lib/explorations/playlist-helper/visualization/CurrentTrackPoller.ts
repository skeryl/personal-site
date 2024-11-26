import { type CurrentlyPlayingContextObject, SpotifyClient } from '@sc/spotify';
import type { ContentParams } from '$lib/content-params';

export class PlaybackContextUpdateEvent extends Event {
	static EVENT_NAME = 'playback-context-update';

	constructor(public readonly context: CurrentlyPlayingContextObject) {
		super(PlaybackContextUpdateEvent.EVENT_NAME);
	}
}

export type ContextUpdateEventHandler = (context: CurrentlyPlayingContextObject) => void;

export class CurrentTrackPoller {
	private isPolling = false;
	private isFetching = false;
	private pollIntervalId: number | undefined;

	private emitter = new EventTarget();

	constructor(
		private readonly client: SpotifyClient,
		private onRefreshNeeded: () => Promise<void>,
		private readonly interval = 6000
	) {}

	public get isStarted(): boolean {
		return this.isPolling;
	}

	start() {
		if (this.isPolling) {
			return;
		}
		this.clearInterval();
		this.pollIntervalId = window.setInterval(this.poll.bind(this), this.interval);
	}

	stop() {
		this.isPolling = false;
		this.clearInterval();
	}

	subscribe(onUpdate: ContextUpdateEventHandler) {
		const callbackInstance: EventListener = (event) => {
			onUpdate((event as PlaybackContextUpdateEvent).context);
		};
		this.emitter.addEventListener(PlaybackContextUpdateEvent.EVENT_NAME, callbackInstance);
		return callbackInstance;
	}

	unsubscribe(listener: EventListener) {
		this.emitter.removeEventListener(PlaybackContextUpdateEvent.EVENT_NAME, listener);
	}

	private clearInterval() {
		if (this.pollIntervalId !== undefined) {
			window.clearInterval(this.pollIntervalId);
		}
	}

	private async poll() {
		if (this.isFetching) {
			console.warn(
				"skipping poll because I'm already fetching (perhaps I should decrease the poll interval 🤔"
			);
		} else {
			this.isFetching = true;
			try {
				const context = await this.client.getCurrentlyPlaying();
				if ((context as CurrentlyPlayingContextObject).item) {
					this.emitter.dispatchEvent(
						new PlaybackContextUpdateEvent(context as CurrentlyPlayingContextObject)
					);
				} else {
					console.error('Received errant response in poll!', context);
					this.onRefreshNeeded();
				}
			} finally {
				this.isFetching = false;
			}
		}
	}
}
