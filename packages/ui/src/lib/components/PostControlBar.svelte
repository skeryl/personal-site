<script lang="ts">
	import { stopPropagation } from 'svelte/legacy';

	import Icon from '$lib/components/icons/Icon.svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import { getContext } from 'svelte';
	import {
		PlayState,
		PlayStateChangedEvent,
		PostControlContext,
		RecordingCompleteEvent,
		IG_FORMATS,
		type IgFormat
	} from '$lib/state/post-control';
	import { type ContentParam, type ContentParams, ParamType } from '$lib/content-params';
	import ParamInput from '$lib/components/content-params/ParamInput.svelte';

	interface Props {
		toggleFullScreen: MouseEventHandler<any>;
		toggleParams: MouseEventHandler<any>;
		postId?: string;
		hasParams: boolean | undefined;
	}

	let { toggleFullScreen, toggleParams, postId = 'post', hasParams }: Props = $props();

	const ctx = getContext('post-control') as PostControlContext;

	let playState = $state(ctx.state.playState);
	let downloadLink: string | undefined = $state(undefined);

	ctx.addEventListener('post-play-state-changed', (ev) => {
		playState = (ev as PlayStateChangedEvent).currentPlayState;
	});

	ctx.addEventListener('post-recording-complete', (ev) => {
		downloadLink = (ev as RecordingCompleteEvent).blobLink;
	});

	let isRecording = $derived(playState === PlayState.recording);
	let isPaused = $derived(playState === PlayState.paused);

	let activeCountdownTimeout: number | undefined;
	let activeCountdownStart: Date | undefined = $state();
	let countdownSecondsLeft: string | undefined = $state();
	let recalcInterval: number | undefined;

	function recalcCountdownSecondsLeft() {
		if (activeCountdownStart) {
			countdownSecondsLeft = Math.round(
				(activeCountdownStart.getTime() + 3000 - Date.now()) / 1000
			).toString();
		}
	}

	function resetState() {
		window.clearInterval(recalcInterval);
		countdownSecondsLeft = undefined;
		activeCountdownStart = undefined;
		activeCountdownTimeout = undefined;
		recalcInterval = undefined;
	}

	function onRecordClicked(e: Event) {
		e.stopPropagation();
		if (activeCountdownTimeout) {
			window.clearTimeout(activeCountdownTimeout);
			resetState();
			return;
		}

		if (isRecording) {
			// stop recording
			ctx.setPlayState(PlayState.playing);
		} else {
			activeCountdownStart = new Date();
			activeCountdownTimeout = window.setTimeout(() => {
				ctx.setPlayState(PlayState.recording);
				resetState();
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

	function dismissRecording() {
		downloadLink = undefined;
	}

	let igFormat: IgFormat = $state(null);

	function onFormatChange(e: Event) {
		igFormat = (e.target as HTMLSelectElement).value as IgFormat || null;
		ctx.setIgFormat(igFormat);
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
		<select
			onchange={onFormatChange}
			disabled={isRecording}
			class="ml-2 self-center text-xs bg-transparent disabled:opacity-40"
		>
			<option value="">Original</option>
			{#each Object.entries(IG_FORMATS) as [key, fmt]}
				<option value={key}>{fmt.label}</option>
			{/each}
		</select>
		<button class="p-2 flex self-center" onclick={stopPropagation(onRecordClicked)}>
			<Icon
				type={activeCountdownStart
					? 'player-stop'
					: isRecording
						? 'player-stop-filled'
						: 'player-record-filled'}
				className={`hover:text-theme-danger control-icon ${isRecording || activeCountdownStart ? 'text-theme-danger' : ''}`}
			/>
			{#if countdownSecondsLeft}
				<span class="content-center pl-1">
					{countdownSecondsLeft}
				</span>
			{/if}
		</button>
		{#if downloadLink}
			<div class="flex self-center h-full content-center">
				<a
					href={downloadLink}
					download={`${postId}.${typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4') ? 'mp4' : 'webm'}`}
					class="flex items-center text-theme-text text-sm"
				>
					<span
						class="flex items-center px-4 py-1 rounded-full"
						style="background-color: color-mix(in srgb, var(--color-accent-success-bg) 40%, transparent)"
						><Icon
							type="download"
							className="text-theme-success mr-1 hover:text-theme-success"
							size="sm"
						></Icon> download recording</span
					>
				</a>
				<button
					class="flex self-center pl-1"
					aria-label="click to dismiss recording"
					onclick={dismissRecording}
				>
					<Icon type="circle-x" className="hover:text-theme-danger" size="sm" />
				</button>
			</div>
		{/if}
	</div>
	{#if hasParams}
		<div class="flex mr-2">
			<button onclick={toggleParams} class="flex">
				<Icon type="settings" className="control-icon justify-center self-center items-center" />
			</button>
		</div>
	{/if}
	<div class="flex mr-2">
		<button onclick={toggleFullScreen} class="flex h-full p-2">
			<Icon type="maximize" className="control-icon justify-center self-center items-center" />
		</button>
	</div>
</div>
