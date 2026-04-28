<script lang="ts">
	import { stopPropagation } from 'svelte/legacy';

	import type { MouseEventHandler } from 'svelte/elements';
	import { getContext } from 'svelte';
	import {
		PlayState,
		PlayStateChangedEvent,
		PostControlContext,
		RecordingCompleteEvent,
		IgFormatChangedEvent,
		IG_FORMATS,
		type IgFormat
	} from '$lib/state/post-control';

	interface Props {
		toggleFullScreen: MouseEventHandler<any>;
		toggleParams: MouseEventHandler<any>;
		takeScreenshot: () => void;
		postId?: string;
		hasParams: boolean | undefined;
		paramsOpen?: boolean;
		initialIgFormat?: IgFormat;
	}

	let {
		toggleFullScreen,
		toggleParams,
		takeScreenshot,
		postId = 'post',
		hasParams,
		paramsOpen = false,
		initialIgFormat = null
	}: Props = $props();

	const ctx = getContext('post-control') as PostControlContext;

	let playState = $state(ctx.state.playState);

	ctx.addEventListener('post-play-state-changed', (ev) => {
		playState = (ev as PlayStateChangedEvent).currentPlayState;
	});

	ctx.addEventListener('post-recording-complete', (ev) => {
		const link = (ev as RecordingCompleteEvent).blobLink;
		const ext =
			typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')
				? 'mp4'
				: 'webm';
		const a = document.createElement('a');
		a.href = link;
		a.download = `${postId}.${ext}`;
		a.style.cssText = 'position:absolute;visibility:hidden';
		document.body.appendChild(a);
		a.click();
		setTimeout(() => document.body.removeChild(a), 100);
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

	let igFormat: IgFormat = $state(initialIgFormat);
	let formatOpen = $state(false);

	const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

	const formatOptions: { value: IgFormat; label: string }[] = [
		{ value: null, label: 'Full Screen' },
		...Object.entries(IG_FORMATS).map(([key, fmt]) => ({
			value: key as IgFormat,
			label: fmt.label
		}))
	];

	let visibleFormatOptions = formatOptions;

	let selectedFormatLabel = $derived(
		visibleFormatOptions.find((o) => o.value === igFormat)?.label ?? visibleFormatOptions[0].label
	);

	function setFormat(value: IgFormat) {
		igFormat = value;
		formatOpen = false;
		ctx.setIgFormat(value);
	}
</script>

<div class="control-bar">
	<div class="control-left">
		<!-- Format selector -->
		<div class="format-dropdown" class:format-open={formatOpen}>
			<button
				class="format-trigger"
				class:disabled={isRecording}
				onclick={() => {
					if (!isRecording) formatOpen = !formatOpen;
				}}
				aria-haspopup="listbox"
				aria-expanded={formatOpen}
			>
				<span>{selectedFormatLabel}</span>
				<svg class="format-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
					<path
						d="M1 1l4 4 4-4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
			{#if formatOpen}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="format-backdrop" onclick={() => (formatOpen = false)}></div>
				<ul class="format-menu" role="listbox">
					{#each visibleFormatOptions as opt}
						<li role="option" aria-selected={opt.value === igFormat}>
							<button
								class="format-item"
								class:active={opt.value === igFormat}
								onclick={() => setFormat(opt.value)}
							>
								{opt.label}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>

<!-- Vertical icon column, right side -->
<div class="icon-column">
	<!-- Screenshot -->
	{#if !paramsOpen}
		<button class="icon-btn" onclick={takeScreenshot} aria-label="Screenshot">
			<span class="custom-icon icon-camera"></span>
		</button>
	{/if}

	<!-- Record -->
	{#if !paramsOpen}
		<button
			class="icon-btn record-btn"
			onclick={stopPropagation(onRecordClicked)}
			aria-label="Record"
		>
			{#if isRecording || activeCountdownStart}
				<div class="record-btn-inner">
					<span
						class="custom-icon icon-stop"
						class:stop-active={isRecording && !activeCountdownStart}
					></span>
					{#if countdownSecondsLeft}
						<span class="countdown-overlay">{countdownSecondsLeft}</span>
					{/if}
				</div>
			{:else}
				<span class="custom-icon icon-record"></span>
			{/if}
		</button>
	{/if}

	{#if hasParams && !paramsOpen}
		<button class="icon-btn" onclick={toggleParams} aria-label="Parameters">
			<span class="custom-icon icon-settings"></span>
		</button>
	{/if}

	{#if !paramsOpen}
		<button class="icon-btn" onclick={toggleFullScreen} aria-label="Full screen">
			<span class="custom-icon icon-fullscreen"></span>
		</button>
	{/if}
</div>

<style>
	.control-bar {
		display: flex;
		align-items: flex-end;
		padding: 0 1.5rem 2.2rem;
		font-family: 'DM Sans', sans-serif;
	}

	.control-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.icon-column {
		position: fixed;
		right: 1.5rem;
		bottom: 2.2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		z-index: 20;
	}

	/* Format dropdown */
	.format-dropdown {
		position: relative;
	}

	.format-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: none;
		border: none;
		border-bottom: 1px solid #000;
		padding: 0.125rem 0;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #000;
		cursor: pointer;
		min-width: 17rem;
		max-width: calc(100vw - 6rem);
	}

	.format-trigger.disabled {
		opacity: 0.4;
		cursor: default;
	}

	.format-chevron {
		color: #000;
		flex-shrink: 0;
		transition: transform 0.15s;
	}

	.format-open .format-chevron {
		transform: rotate(180deg);
	}

	.format-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
	}

	.format-menu {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 0;
		background: white;
		border: 1px solid #e5e5e5;
		list-style: none;
		margin: 0;
		padding: 0.25rem 0;
		z-index: 50;
		min-width: 100%;
		white-space: nowrap;
	}

	.format-item {
		display: block;
		width: 100%;
		padding: 0.4rem 1.25rem;
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #000;
		text-align: left;
	}

	.format-item:hover,
	.format-item.active {
		background: #f5f5f5;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		color: #222222;
	}

	.custom-icon {
		display: block;
		width: 1.5125rem;
		height: 1.5125rem;
		background-color: currentColor;
		mask-size: contain;
		mask-repeat: no-repeat;
		mask-position: center;
	}

	.icon-camera {
		mask-image: url('/camera-icon.svg');
	}
	.icon-record {
		mask-image: url('/record-icon.svg');
	}
	.icon-stop {
		mask-image: url('/stop-icon.svg');
	}
	.icon-settings {
		mask-image: url('/settings-icon.svg');
	}
	.icon-fullscreen {
		mask-image: url('/fullscreen-icon.svg');
	}

	.stop-active {
		color: #c90000;
	}

	.record-btn-inner {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.countdown-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'DM Mono', monospace;
		font-size: 0.6rem;
		font-weight: 500;
		color: #fff;
		pointer-events: none;
	}

	@media (max-width: 639px) {
		.control-bar {
			padding: 0.75rem 1.25rem 0.5rem;
			justify-content: center;
			margin-bottom: 1rem;
		}

		.format-trigger {
			min-width: unset;
			width: min(17rem, calc(100vw - 6rem));
		}

		.icon-column {
			position: static;
			flex-direction: row;
			justify-content: space-around;
			align-items: center;
			padding: 0 0.5rem 2rem;
			right: auto;
			bottom: auto;
			gap: 0;
		}
	}
</style>
