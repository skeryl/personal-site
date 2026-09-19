<script lang="ts">
	/*
	 * Overview of the whole quilt with the visible region drawn on it, for when
	 * the wall is zoomed past what fits. One rect per block using its dominant
	 * fabric: real piece geometry is noise at this size and costs far more.
	 */

	interface Props {
		cols: number;
		rows: number;
		/** One fill per block, in board order. */
		fills: readonly string[];
		/** Visible region as fractions of the full quilt. */
		view: { x: number; y: number; w: number; h: number };
		/** Centre the viewport on this point, in fractions of the full quilt. */
		onPan: (fx: number, fy: number) => void;
	}

	let { cols, rows, fills, view, onPan }: Props = $props();

	const SIZE = 128;
	const width = $derived(cols >= rows ? SIZE : Math.round((SIZE * cols) / rows));
	const height = $derived(cols >= rows ? Math.round((SIZE * rows) / cols) : SIZE);

	let el = $state<HTMLButtonElement | null>(null);
	let dragging = $state(false);

	const panFromEvent = (e: PointerEvent) => {
		if (!el) return;
		const rect = el.getBoundingClientRect();
		onPan((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
	};

	const nudge = (dx: number, dy: number) =>
		onPan(view.x + view.w / 2 + dx * view.w, view.y + view.h / 2 + dy * view.h);

	const onKeyDown = (e: KeyboardEvent) => {
		const step = 0.5;
		if (e.key === 'ArrowLeft') nudge(-step, 0);
		else if (e.key === 'ArrowRight') nudge(step, 0);
		else if (e.key === 'ArrowUp') nudge(0, -step);
		else if (e.key === 'ArrowDown') nudge(0, step);
		else return;
		e.preventDefault();
	};
</script>

<button
	class="minimap"
	bind:this={el}
	type="button"
	aria-label="Quilt overview: drag or use the arrow keys to move the visible area"
	style="width: {width}px; height: {height}px"
	onpointerdown={(e) => {
		dragging = true;
		el?.setPointerCapture(e.pointerId);
		panFromEvent(e);
	}}
	onpointermove={(e) => dragging && panFromEvent(e)}
	onpointerup={(e) => {
		dragging = false;
		el?.releasePointerCapture(e.pointerId);
	}}
	onkeydown={onKeyDown}
>
	<svg viewBox="0 0 {cols} {rows}" preserveAspectRatio="none" aria-hidden="true">
		{#each fills as fill, i (i)}
			<rect x={i % cols} y={Math.floor(i / cols)} width="1" height="1" {fill} />
		{/each}
	</svg>
	<span
		class="view"
		aria-hidden="true"
		style="left: {view.x * 100}%; top: {view.y * 100}%; width: {view.w * 100}%; height: {view.h *
			100}%"
	></span>
</button>

<style>
	.minimap {
		position: relative;
		padding: 0;
		border: 1px solid var(--qb-line);
		background: #fff;
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
		cursor: crosshair;
		touch-action: none;
		line-height: 0;
	}
	.minimap:focus-visible {
		outline: 2px solid var(--qb-accent);
		outline-offset: 2px;
	}
	svg {
		display: block;
		width: 100%;
		height: 100%;
	}
	.view {
		position: absolute;
		border: 1.5px solid var(--qb-accent);
		background: rgba(199, 102, 228, 0.14);
		pointer-events: none;
	}
</style>
