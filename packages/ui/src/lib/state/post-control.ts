import type { ContentParams } from '$lib/content-params';

export enum PlayState {
	playing = 'playing',
	paused = 'paused',
	recording = 'recording',
	recordingPaused = 'recordingPaused'
}

export interface PostControlState {
	playState: PlayState;
	/*hasFocus: boolean;*/
	isFullScreen: boolean;
}

export type PostEvents = 'full-screen-change' | 'play-state-change';

export type FullScreenChangeHandler = (isFullScreen: boolean) => void;
export type PlayStateChangeHandler = (
	currentPlayState: PlayState,
	pastPlayState: PlayState
) => void;

export type Handlers = FullScreenChangeHandler | PlayStateChangeHandler;

export type HandlerMap<T extends PostEvents> = T extends 'full-screen-change'
	? FullScreenChangeHandler
	: PlayStateChangeHandler;

export class FullScreenChangeEvent extends Event {
	constructor(public readonly isFullScreen: boolean) {
		super('post-full-screen-changed');
	}
}
export class PlayStateChangedEvent extends Event {
	constructor(
		public readonly currentPlayState: PlayState,
		public readonly previousPlayState: PlayState
	) {
		super('post-play-state-changed');
	}
}

export class RecordingCompleteEvent extends Event {
	constructor(public readonly blobLink: string) {
		super('post-recording-complete');
	}
}

export class ParamsChangedEvent extends Event {
	static EVENT_NAME = 'content-params-changed';

	constructor(public readonly params: ContentParams) {
		super(ParamsChangedEvent.EVENT_NAME);
	}
}

export class PostControlContext extends EventTarget {
	private recorder: MediaRecorder | undefined = undefined;

	constructor(public readonly state: PostControlState) {
		super();
	}

	async setFullScreen(isFullScreen: boolean): Promise<void> {
		this.state.isFullScreen = isFullScreen;
		this.dispatchEvent(new FullScreenChangeEvent(isFullScreen));
	}

	async setPlayState(playState: PlayState): Promise<void> {
		const previousState = this.state.playState;
		this.state.playState = playState;
		this.dispatchEvent(new PlayStateChangedEvent(playState, previousState));

		if (previousState === PlayState.recording && playState !== PlayState.recordingPaused) {
			if (this.recorder) {
				this.recorder.stop();
			}
		}
	}

	public get isFullScreen(): boolean {
		return this.state.isFullScreen;
	}

	public get playState(): PlayState {
		return this.state.playState;
	}

	public captureRecording(stream: MediaStream) {
		const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
		const chunks = new Array<Blob>();

		recorder.ondataavailable = ({ data }) => {
			chunks.push(data);
		};

		recorder.onstop = () => {
			const blob = new Blob(chunks, { type: 'video/webm' });
			const link = URL.createObjectURL(blob);
			this.dispatchEvent(new RecordingCompleteEvent(link));
		};

		recorder.start();
		this.recorder = recorder;
	}

	public setParams(params: ContentParams) {
		this.dispatchEvent(new ParamsChangedEvent(params));
	}

	public onParamsChanged(callback: (cp: ContentParams) => void) {
		this.addEventListener(ParamsChangedEvent.EVENT_NAME, (ev) =>
			callback((ev as ParamsChangedEvent).params)
		);
	}
}
