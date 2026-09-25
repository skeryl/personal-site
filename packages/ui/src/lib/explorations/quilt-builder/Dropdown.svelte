<script lang="ts">
	/*
	 * The design's dropdown, built rather than borrowed.
	 *
	 * A native <select> takes its list from the platform, so it can show one
	 * string per row and nothing else. The quilt sizes want three columns and
	 * a row of inputs at the foot, and every one of these wants the design's
	 * own chrome, so the list is ours.
	 *
	 * Two shapes, from the two places the design puts them: inline, a value
	 * underlined with a caret, for the dimensions along the top of the
	 * palette; and boxed, a bordered field, for the quilt size over the wall.
	 */

	export interface Choice {
		value: string;
		label: string;
		/** Extra columns, shown against the headings when there are any. */
		cols?: string[];
	}

	let {
		label = '',
		display,
		choices,
		value,
		headings = [],
		variant = 'inline',
		width = 0,
		title = '',
		onpick,
		custom = null
	}: {
		label?: string;
		display: string;
		choices: readonly Choice[];
		value: string;
		/** Column headings; given, the rows lay out as a table. */
		headings?: readonly string[];
		variant?: 'inline' | 'boxed';
		/** Menu width in pixels; defaults to the trigger's. */
		width?: number;
		title?: string;
		onpick: (value: string) => void;
		/** A pair of numbers at the foot of the list, as the quilt sizes have. */
		custom?: {
			value: string;
			w: number;
			h: number;
			min: number;
			max: number;
			onchange: (w: number, h: number) => void;
		} | null;
	} = $props();

	let open = $state(false);
	let root = $state<HTMLElement | null>(null);

	const close = () => (open = false);

	const choose = (next: string) => {
		onpick(next);
		close();
	};

	/* A click anywhere else puts the list away, as the picker does. */
	$effect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) close();
		};
		window.addEventListener('pointerdown', onDown);
		return () => window.removeEventListener('pointerdown', onDown);
	});
</script>

<div
	class="dropdown {variant}"
	bind:this={root}
	onkeydown={(e) => {
		if (e.key !== 'Escape' || !open) return;
		e.stopPropagation();
		close();
	}}
	role="presentation"
>
	{#if label}
		<span class="field-label">{label}</span>
	{/if}
	<button
		class="trigger"
		{title}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label={label ? `${label} ${display}` : display}
		onclick={() => (open = !open)}
	>
		<span class="display">{display}</span>
		<svg class="caret" viewBox="0 0 13 13" aria-hidden="true">
			<path d="M3 5 L6.5 9 L10 5" fill="none" stroke="currentColor" stroke-width="1" />
		</svg>
	</button>

	{#if open}
		<div class="menu" role="listbox" style={width ? `width: ${width}px` : ''}>
			{#if headings.length}
				<div class="row headings" role="presentation">
					{#each headings as heading, i (heading)}
						<span class:lead={i === 0}>{heading}</span>
					{/each}
				</div>
			{/if}
			{#each choices as choice, i (choice.value)}
				<button
					class="row option"
					class:striped={i % 2 === 0}
					class:current={choice.value === value}
					role="option"
					aria-selected={choice.value === value}
					onclick={() => choose(choice.value)}
				>
					<span class="lead">{choice.label}</span>
					{#each choice.cols ?? [] as col, c (c)}
						<span>{col}</span>
					{/each}
				</button>
			{/each}
			{#if custom}
				{@const entry = custom}
				<div class="row custom" class:striped={choices.length % 2 === 0} role="presentation">
					<button
						class="lead as-option"
						role="option"
						aria-selected={entry.value === value}
						onclick={() => choose(entry.value)}>Custom</button
					>
					<label>
						<span class="sr-only">Custom width in inches</span>
						<input
							type="number"
							min={entry.min}
							max={entry.max}
							value={entry.w}
							onchange={(e) => entry.onchange(Number(e.currentTarget.value), entry.h)}
						/>
					</label>
					<label>
						<span class="sr-only">Custom height in inches</span>
						<input
							type="number"
							min={entry.min}
							max={entry.max}
							value={entry.h}
							onchange={(e) => entry.onchange(entry.w, Number(e.currentTarget.value))}
						/>
					</label>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dropdown {
		position: relative;
		display: inline-flex;
		align-items: baseline;
		gap: 0.3rem;
	}

	/* The dimensions along the top of the palette: 10px Cabin, in the design. */
	.field-label {
		font-family: var(--qb-sans);
		font-size: 10px;
		line-height: 20px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #000;
		white-space: nowrap;
	}

	.trigger {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 0;
		border: none;
		background: none;
		color: #000;
		cursor: pointer;
	}
	.caret {
		width: 13px;
		height: 13px;
		flex: none;
	}

	/* Inline: the value underlined, with the caret alongside. */
	.inline .trigger {
		border-bottom: 1px solid #000;
	}
	/* Set at the size of the label it answers, so the pair reads as one line. */
	.inline .display {
		font-family: var(--qb-mono);
		font-size: 12px;
		line-height: 20px;
		white-space: nowrap;
	}

	/*
	 * Boxed: the quilt size over the wall. The design drops the field's border
	 * here and lets the size sit as plain text beside its caret, at the weight
	 * of the quilt's own name across from it.
	 */
	.boxed {
		display: inline-flex;
		align-items: baseline;
		gap: 5px;
	}
	.boxed .trigger {
		height: 20px;
		gap: 4px;
		justify-content: flex-end;
		background: none;
		border: none;
		border-bottom: 0.5px solid #000;
	}
	.boxed .display {
		font-family: var(--qb-mono);
		font-size: 12px;
		line-height: 18px;
		color: #000;
	}
	.boxed .caret {
		width: 13px;
		height: 13px;
		color: var(--qb-ink);
	}

	.menu {
		position: absolute;
		z-index: 20;
		top: 100%;
		left: 0;
		min-width: 100%;
		margin-top: -1px;
		background: #fff;
		border: 0.5px solid #000;
		font-family: var(--qb-sans);
		font-size: 10px;
		color: #000;
	}
	/* Both triggers sit at the right of their row, so the list hangs from it. */
	.inline .menu,
	.boxed .menu {
		left: auto;
		right: 0;
	}

	.row {
		display: grid;
		grid-template-columns: 1fr;
		align-items: center;
		width: 100%;
		height: 25px;
		padding: 0 16px;
		border: none;
		background: none;
		font: inherit;
		text-align: left;
	}
	.row:has(span:nth-child(3)),
	.row.custom {
		grid-template-columns: 1fr 29px 29px;
		justify-items: center;
	}
	.row .lead {
		justify-self: start;
	}
	.headings {
		font-weight: 600;
		text-transform: uppercase;
	}
	.headings .lead {
		font-weight: 600;
	}
	/* Every other row tinted, as the design stripes them. */
	.striped {
		background: #f6f8fc;
	}
	.option {
		cursor: pointer;
	}
	.option:hover,
	.option.current {
		background: var(--qb-square);
	}

	.custom .as-option {
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		cursor: pointer;
	}
	.custom input {
		width: 25px;
		padding: 0;
		font: inherit;
		text-align: center;
		color: #000;
		background: #e0e2e6;
		border: none;
		border-bottom: 1px solid #000;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.custom input::-webkit-outer-spin-button,
	.custom input::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
</style>
