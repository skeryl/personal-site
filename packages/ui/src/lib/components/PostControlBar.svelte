<script lang="ts">
	import Icon from '$lib/components/icons/Icon.svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import { getContext } from 'svelte';
	import {
		PlayState,
		PlayStateChangedEvent,
		PostControlContext,
		RecordingCompleteEvent
	} from '$lib/state/post-control';

	export let toggleFullScreen: MouseEventHandler<any>;
	export let postId: string = 'post';

	const ctx = getContext('post-control') as PostControlContext;

	let playState = ctx.state.playState;
	let downloadLink: string | undefined;

	ctx.addEventListener('post-play-state-changed', (ev) => {
		playState = (ev as PlayStateChangedEvent).currentPlayState;
	});

	ctx.addEventListener('post-recording-complete', (ev) => {
		downloadLink = (ev as RecordingCompleteEvent).blobLink;
	});

	$: isRecording = playState === PlayState.recording;
	$: isPaused = playState === PlayState.paused;

	let activeCountdownTimeout: number | undefined;
	let activeCountdownStart: Date | undefined;
	let countdownSecondsLeft: string | undefined;
	let recalcInterval: number | undefined;

	function recalcCountdownSecondsLeft() {
		if (activeCountdownStart) {
			countdownSecondsLeft = Math.round(
				(activeCountdownStart.getTime() + 3000 - Date.now()) / 1000
			).toString();
		}
	}

	function onRecordClicked(e: MouseEvent) {
		e.stopPropagation();
		if (isRecording) {
			// stop recording
			ctx.setPlayState(PlayState.playing);
		} else {
			activeCountdownStart = new Date();
			activeCountdownTimeout = window.setTimeout(() => {
				ctx.setPlayState(PlayState.recording);
				window.clearInterval(recalcInterval);
				countdownSecondsLeft = undefined;
				activeCountdownStart = undefined;
				activeCountdownTimeout = undefined;
				recalcInterval = undefined;
			}, 3000);
			recalcInterval = window.setInterval(recalcCountdownSecondsLeft, 300);
		}
	}

	function togglePlayPause() {
		if (isPaused) {
			ctx.setPlayState(PlayState.playing);
		} else {
			ctx.setPlayState(PlayState.paused);
		}
	}
</script>

<div class="flex flex-row bg-surface h-12 justify-between">
	<div class="flex flex-1">
		<!-- the world isn't ready for play/pause (and neither is my old code) -->
		<!--<button class="p-2" on:click={togglePlayPause}>
			<Icon
					type={isPaused ? 'player-play-filled' : 'player-pause-filled'}
					className={`control-icon ${isRecording ? 'text-red-600' : ''}`}
			></Icon>
		</button>-->
		<button class="p-2 flex self-center" on:click|stopPropagation={onRecordClicked}>
			<Icon
				type={activeCountdownStart ? 'player-stop' : isRecording ? 'player-stop-filled' : 'player-record-filled'}
				className={`hover:text-red-600 control-icon ${isRecording || activeCountdownStart ? 'text-red-600' : ''}`}
			/>
			{#if countdownSecondsLeft}
				<span class="content-center pl-1">
					{countdownSecondsLeft}
				</span>
			{/if}
		</button>
		{#if downloadLink}
			<div class="flex h-full content-center">
				<a
					href={downloadLink}
					download={`${postId}.webm`}
					class="block text-neutral-600 text-sm h-full self-center align-middle"
				>
					download last recording here
				</a>
			</div>
		{/if}
	</div>
	<div class="flex">
		<button on:click={toggleFullScreen} class="flex h-full p-2">
			<Icon type="maximize" className="control-icon justify-center self-center items-center" />
		</button>
	</div>
</div>
