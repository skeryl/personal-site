<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chessground } from 'chessground';
	import type { Api } from 'chessground/api';
	import type { Config } from 'chessground/config';
	import type { Key, Color as CgColor, Dests } from 'chessground/types';
	import 'chessground/assets/chessground.base.css';
	import 'chessground/assets/chessground.brown.css';
	import 'chessground/assets/chessground.cburnett.css';

	interface Props {
		fen: string;
		orientation: CgColor;
		turnColor: CgColor;
		lastMove?: [Key, Key];
		dests?: Dests;
		movable?: CgColor | 'both';
		check?: boolean;
		viewOnly?: boolean;
		onMove?: (from: Key, to: Key) => void;
		onReady?: (api: Api) => void;
	}

	let {
		fen,
		orientation,
		turnColor,
		lastMove,
		dests,
		movable,
		check = false,
		viewOnly = false,
		onMove,
		onReady
	}: Props = $props();

	let el: HTMLDivElement | undefined = $state();
	let api: Api | undefined;

	function buildConfig(): Config {
		return {
			fen,
			orientation,
			turnColor,
			lastMove,
			check,
			viewOnly,
			coordinates: true,
			animation: { enabled: true, duration: 180 },
			highlight: { lastMove: true, check: true },
			movable: {
				color: movable,
				dests,
				showDests: true,
				free: false,
				events: {
					after: (orig, dest) => {
						onMove?.(orig as Key, dest as Key);
					}
				}
			},
			premovable: { enabled: false },
			draggable: { enabled: !viewOnly, showGhost: true },
			selectable: { enabled: !viewOnly },
			drawable: { enabled: true, visible: true }
		};
	}

	onMount(() => {
		if (!el) return;
		api = Chessground(el, buildConfig());
		onReady?.(api);
	});

	onDestroy(() => {
		api?.destroy();
	});

	$effect(() => {
		if (api) api.set(buildConfig());
	});
</script>

<div class="board-frame">
	<div bind:this={el} class="cg-wrap"></div>
</div>

<style>
	.board-frame {
		width: 100%;
		max-width: 520px;
		margin: 0 auto;
	}
	.cg-wrap {
		width: 100%;
		aspect-ratio: 1 / 1;
		touch-action: none;
	}
</style>
