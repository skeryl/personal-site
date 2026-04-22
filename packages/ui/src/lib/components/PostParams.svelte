<script lang="ts">
	import { type ContentParam, ParamType, type ContentParams } from '$lib/content-params/index.js';
	import ColorPicker from '$lib/components/content-params/ColorPicker.svelte';

	interface Props {
		params: ContentParams;
		onParamsChange: (p: ContentParams) => void;
		onClose: () => void;
	}

	let { params = $bindable(), onParamsChange, onClose }: Props = $props();

	// Desktop: group params into sections
	let sections = $derived.by(() => {
		const map = new Map<string, ContentParam<ParamType>[]>();
		for (const param of params) {
			const key = param.group ?? '';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(param);
		}
		// Drop groups with no renderable (color/number) params
		return Array.from(map.entries())
			.map(([label, items]) => ({ label, items }))
			.filter((s) =>
				s.items.some(
				(p) =>
					p.type === ParamType.color ||
					p.type === ParamType.number ||
					(p.type === ParamType.string && p.options)
			)
			);
	});

	// Mobile: group-based navigation
	let activeGroupIndex = $state(0);
	let activeGroup = $derived(sections[activeGroupIndex]);
	let visibleParams = $derived(
		activeGroup?.items.filter(
			(p) =>
				p.type === ParamType.color ||
				p.type === ParamType.number ||
				(p.type === ParamType.string && p.options)
		) ?? []
	);
	// Per-group memory: remember which param tab the user last selected for each group
	let groupActiveParamIndex = $state<Record<number, number>>({});
	let activeParamIndex = $derived(groupActiveParamIndex[activeGroupIndex] ?? 0);
	let activeParam = $derived(visibleParams[activeParamIndex] as ContentParam<ParamType> | undefined);

	function setActiveParam(i: number) {
		groupActiveParamIndex = { ...groupActiveParamIndex, [activeGroupIndex]: i };
	}
	// Whole-post check: do any params anywhere need the taller color-picker layout?
	let hasColorParams = $derived(params.some((p) => p.type === ParamType.color));

	function revertGroup() {
		const groupIds = new Set(activeGroup?.items.map((p) => p.id) ?? []);
		const reverted = params.map((p) => (groupIds.has(p.id) ? { ...p, value: p.defaultValue } : p));
		onParamsChange(reverted);
		params = reverted;
	}

	function onParamChange(changed: ContentParam<ParamType>) {
		if (params && onParamsChange) {
			const newParams = params.map((p) => (p.id === changed.id ? changed : p));
			onParamsChange(newParams);
			params = newParams;
		}
	}

	function formatValue(param: ContentParam<ParamType>): string {
		if (param.type === ParamType.number && typeof param.value === 'number') {
			return param.value % 1 === 0 ? param.value.toString() : param.value.toFixed(2);
		}
		return String(param.value ?? '');
	}

	function onSliderInput(param: ContentParam<ParamType>, e: Event) {
		const value = Number((e.target as HTMLInputElement).value);
		onParamChange({ ...param, value });
	}

	let openPickerId = $state<string | null>(null);
</script>

<!-- ── DESKTOP: right sidebar ─────────────────────────────────────── -->
<div class="params-sidebar desktop-layout">
	<header class="params-header">
		<span class="params-title">Artwork Parameters</span>
		<button class="close-btn" onclick={onClose} aria-label="Close parameters">×</button>
	</header>

	<div class="params-body">
		{#each sections as section, i}
			{#if section.label}
				{@const visibilityParam = section.items.find((p) => p.type === ParamType.boolean)}
				<div class="section-label" class:section-label-gap={i > 0}>
					<span>{section.label}</span>
					{#if visibilityParam}
						{@const isVisible = visibilityParam.value !== false}
						<button
							class="visibility-toggle"
							class:hidden-zone={!isVisible}
							onclick={() => onParamChange({ ...visibilityParam, value: !isVisible })}
							title={isVisible ? 'Hide zone' : 'Show zone'}
						>
							{#if isVisible}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							{:else}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
							{/if}
						</button>
					{/if}
				</div>
			{/if}
			{#each section.items as param}
				{#if param.type === ParamType.boolean}<!-- rendered in header, skip -->{:else}
				<div class="param-item">
					{#if param.type === ParamType.color}
						{@const hex = String(param.value)}
						{@const isOpen = openPickerId === param.id}
						<div class="color-param">
							<div class="param-label-row">
								<span class="param-label">{param.name} ({hex})</span>
								{#if param.value !== param.defaultValue}
									<button class="reset-btn" onclick={() => onParamChange({ ...param, value: param.defaultValue })} title="Reset to default">↩</button>
								{/if}
							</div>
							{#if param.description}
								<span class="param-description">{param.description}</span>
							{/if}
							<button
								class="color-swatch"
								style="background: {hex}"
								onclick={() => (openPickerId = isOpen ? null : param.id)}
								aria-label={isOpen ? 'Close color picker' : 'Open color picker'}
							></button>
							{#if isOpen}
								<ColorPicker
									value={hex}
									onChange={(newHex) => onParamChange({ ...param, value: newHex })}
								/>
							{/if}
						</div>
					{:else if param.type === ParamType.number}
						{@const range = param.range as { min: number; max: number; step?: number | 'any' } | undefined}
						<div class="slider-param">
							<div class="param-label-row">
								<span class="param-label">{param.name} ({formatValue(param)})</span>
								{#if param.value !== param.defaultValue}
									<button class="reset-btn" onclick={() => onParamChange({ ...param, value: param.defaultValue })} title="Reset to default">↩</button>
								{/if}
							</div>
							{#if param.description}
								<span class="param-description">{param.description}</span>
							{/if}
							{#if range}
								<input
									type="range"
									min={range.min}
									max={range.max}
									step={range.step ?? 'any'}
									value={param.value}
									oninput={(e) => onSliderInput(param, e)}
									class="slider"
								/>
								{#if param.rangeLabels}
									<div class="range-labels">
										<span>{param.rangeLabels[0]}</span>
										<span>{param.rangeLabels[1]}</span>
									</div>
								{/if}
							{/if}
						</div>
					{:else if param.type === ParamType.string && param.options}
						<div class="select-param">
							<div class="param-label-row">
								<span class="param-label">{param.name}</span>
							</div>
							{#if param.description}
								<span class="param-description">{param.description}</span>
							{/if}
							<select
								class="param-select"
								value={param.value}
								onchange={(e) => onParamChange({ ...param, value: (e.target as HTMLSelectElement).value })}
							>
								{#each param.options as opt}
									<option value={opt}>{opt}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>
				{/if}
			{/each}
		{/each}
	</div>
</div>

<!-- ── MOBILE: group panel ────────────────────────────────────── -->
{#if activeGroup}
	<div class="params-strip mobile-layout">
		<!-- Param tabs (COLOR | SIZE (1)) -->
		<div class="strip-param-tabs">
			{#each visibleParams as param, i}
				<button
					class="strip-param-tab"
					class:active={i === activeParamIndex}
					onclick={() => setActiveParam(i)}
					style="font-size: 0.7rem"
				>
					{#if param.type === ParamType.color}
						{param.name}
						<span class="param-tab-color-dot" style="background: {param.value}"></span>
					{:else if param.type === ParamType.number}
						{param.name} ({formatValue(param)})
					{:else}
						{param.name}
					{/if}
				</button>
			{/each}
		</div>

		<!-- Active param content -->
		<div class="strip-content" class:slider-only={!hasColorParams}>
			{#if activeParam?.type === ParamType.color}
				{@const hex = String(activeParam.value)}
				<ColorPicker
					value={hex}
					onChange={(newHex) => onParamChange({ ...activeParam, value: newHex })}
				/>
			{:else if activeParam?.type === ParamType.number}
				{@const range = activeParam.range as { min: number; max: number; step?: number | 'any' } | undefined}
				{#if activeParam.description}
					<span class="param-description">{activeParam.description}</span>
				{/if}
				{#if range}
					<input
						type="range"
						min={range.min}
						max={range.max}
						step={range.step ?? 'any'}
						value={activeParam.value}
						oninput={(e) => onSliderInput(activeParam!, e)}
						class="slider"
					/>
					{#if activeParam.rangeLabels}
						<div class="range-labels">
							<span>{activeParam.rangeLabels[0]}</span>
							<span>{activeParam.rangeLabels[1]}</span>
						</div>
					{/if}
				{:else if activeParam?.type === ParamType.string && activeParam?.options}
				{#if activeParam.description}
					<span class="param-description">{activeParam.description}</span>
				{/if}
				<select
					class="param-select"
					value={activeParam.value}
					onchange={(e) => onParamChange({ ...activeParam, value: (e.target as HTMLSelectElement).value })}
				>
					{#each activeParam.options as opt}
						<option value={opt}>{opt}</option>
					{/each}
				</select>
				{/if}
			{/if}
			<button class="revert-btn" onclick={revertGroup}>
				<svg width="14" height="14" viewBox="0 0 26 26" fill="none">
					<path d="M0.999999 8.5L0.823222 8.67678L0.646445 8.5L0.823222 8.32323L0.999999 8.5ZM8.5 25.25C8.36193 25.25 8.25 25.1381 8.25 25C8.25 24.8619 8.36193 24.75 8.5 24.75L8.5 25L8.5 25.25ZM8.5 16L8.32322 16.1768L0.823222 8.67678L0.999999 8.5L1.17678 8.32323L8.67678 15.8232L8.5 16ZM0.999999 8.5L0.823222 8.32323L8.32322 0.823224L8.5 1L8.67678 1.17678L1.17678 8.67678L0.999999 8.5ZM0.999999 8.5L0.999999 8.25L16.75 8.25L16.75 8.5L16.75 8.75L0.999999 8.75L0.999999 8.5ZM16.75 25L16.75 25.25L8.5 25.25L8.5 25L8.5 24.75L16.75 24.75L16.75 25ZM25 16.75L25.25 16.75C25.25 21.4444 21.4444 25.25 16.75 25.25L16.75 25L16.75 24.75C21.1683 24.75 24.75 21.1683 24.75 16.75L25 16.75ZM16.75 8.5L16.75 8.25C21.4444 8.25 25.25 12.0556 25.25 16.75L25 16.75L24.75 16.75C24.75 12.3317 21.1683 8.75 16.75 8.75L16.75 8.5Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
				</svg>
				revert to default
			</button>
		</div>

		<!-- Group tab bar -->
		<div class="strip-tabs">
			<button class="strip-close" onclick={onClose} aria-label="Close parameters">
				<svg width="20" height="20" viewBox="0 0 26 26" fill="none">
					<path d="M19 7L7 19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M7 7L19 19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			{#each sections as section, i}
				<button
					class="strip-tab"
					class:active={i === activeGroupIndex}
					onclick={() => (activeGroupIndex = i)}
				>
					{section.label || 'Parameters'}
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* ── Show/hide by breakpoint ─────────────────────────────────── */
	.desktop-layout {
		display: flex;
	}
	.mobile-layout {
		display: none;
	}
	@media (max-width: 639px) {
		.desktop-layout {
			display: none;
		}
		.mobile-layout {
			display: block;
		}
	}

	/* ── Desktop sidebar ─────────────────────────────────────────── */
	.params-sidebar {
		flex-direction: column;
		height: 100%;
		background: white;
		font-family: 'DM Sans', sans-serif;
	}

	.params-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 6rem;
		padding: 0 1.25rem;
		border-bottom: 1px solid #e5e5e5;
		flex-shrink: 0;
	}

	.params-title {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
	}

	.close-btn {
		font-size: 1.21rem;
		line-height: 1;
		color: #000;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		opacity: 0.5;
		transition: opacity 0.15s;
	}

	.close-btn:hover {
		opacity: 1;
	}

	.params-body {
		flex: 1;
		overflow-y: auto;
		padding-bottom: 2rem;
	}

	.section-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #000;
		padding: 1.5rem 1.25rem 0.75rem;
	}

	.section-label-gap {
		border-top: 1px solid #e5e5e5;
		margin-top: 1rem;
	}

	.visibility-toggle {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		color: #000;
		display: flex;
		align-items: center;
		opacity: 0.4;
		transition: opacity 0.15s;
	}

	.visibility-toggle:hover {
		opacity: 1;
	}

	.visibility-toggle.hidden-zone {
		opacity: 1;
		color: #999;
	}

	.param-item {
		padding: 0.75rem 1.25rem;
	}

	.param-label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.param-label {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
	}

	.param-description {
		display: block;
		font-size: 0.6rem;
		line-height: 1.3;
		color: #000;
		letter-spacing: 0.02em;
		margin-top: -0.35rem;
		margin-bottom: 0.7rem;
	}

	.param-select {
		width: 100%;
		padding: 0.4rem 0.5rem;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		border: 1px solid #e5e5e5;
		border-radius: 0;
		background: white;
		color: #000;
		cursor: pointer;
	}

	.reset-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-size: 0.75rem;
		color: #000;
		line-height: 1;
		transition: color 0.15s;
	}

	.reset-btn:hover {
		color: #000;
	}

	.color-param {
		display: flex;
		flex-direction: column;
	}

	.color-swatch {
		width: 100%;
		height: 52px;
		border: none;
		border-radius: 0;
		cursor: pointer;
		padding: 0;
		display: block;
	}

	.slider-param {
		display: flex;
		flex-direction: column;
	}

	.slider {
		width: 100%;
		margin: 0;
		background: #e0e0e0;
		height: 5px;
		border-radius: 2px;
		cursor: pointer;
		touch-action: pan-y;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: #c0c0c0;
		cursor: pointer;
	}

	.slider::-moz-range-track {
		background: #e0e0e0;
		height: 5px;
		border-radius: 2px;
	}

	.slider::-moz-range-thumb {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: #c0c0c0;
		border: none;
		cursor: pointer;
	}

	@media (pointer: coarse) {
		.slider {
			height: 5px;
			border-radius: 2px;
			padding: 0;
			box-sizing: border-box;
			background-clip: border-box;
			background: #e0e0e0;
		}
		.slider::-webkit-slider-thumb {
			width: 17px;
			height: 17px;
		}
		.slider::-moz-range-thumb {
			width: 17px;
			height: 17px;
		}
	}

	.range-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.625rem;
		color: #000;
		margin-top: 0.2rem;
		text-transform: lowercase;
	}

	.mobile-layout .param-description {
		font-size: 0.8rem;
		text-align: center;
		margin-top: 0.3rem;
		margin-bottom: 0.75rem;
	}

	@media (max-width: 639px) {
		.strip-param-tab {
			font-size: 0.7rem;
			padding: 0.4rem 1rem;
		}
		.strip-tab {
			font-size: 0.7rem;
		}
		.strip-tab.active {
			font-size: 0.84rem;
		}
	}

	/* ── Mobile panel ────────────────────────────────────────────── */
	.params-strip {
		background: white;
		border-top: 1px solid #e5e5e5;
		font-family: 'DM Sans', sans-serif;
	}

	.revert-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.75rem;
		color: #000;
		padding: 0;
		white-space: nowrap;
		align-self: center;
		margin-top: -3px;
	}

	.revert-btn:hover {
		color: #000;
	}

	/* Param tabs (COLOR | SIZE) */
	.strip-param-tabs {
		display: flex;
		border-bottom: 1px solid #e5e5e5;
		margin: 0.5rem 0 0;
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior: contain;
		touch-action: pan-x;
		scrollbar-width: none;
	}

	.strip-param-tabs::-webkit-scrollbar {
		display: none;
	}

	.strip-param-tab {
		flex-shrink: 0;
		padding: 0.5rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.875rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #000;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.15s;
	}

	.strip-param-tab:first-child {
		margin-left: auto;
	}

	.strip-param-tab:last-child {
		margin-right: auto;
	}

	.strip-param-tab.active {
		color: #000;
		border-bottom-color: #000;
		font-weight: 500;
	}

	/* Active param content */
	.strip-content {
		padding: 0.75rem 2rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 250px;
		justify-content: center;
	}

	.strip-content.slider-only {
		height: 120px;
		padding: 0.4rem 2rem 0.6rem;
	}

	.strip-content.slider-only .revert-btn {
		margin-top: 1.25rem;
	}

	.param-tab-color-dot {
		display: inline-block;
		width: 1em;
		height: 1em;
		border-radius: 50%;
		margin-left: 0.5em;
		vertical-align: -0.15em;
	}

	.strip-tabs {
		display: flex;
		align-items: center;
		border-top: 1px solid #e5e5e5;
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior: contain;
		touch-action: pan-x;
		scrollbar-width: none;
		padding: 0.4rem 0.25rem 0.75rem;
	}

	.strip-tabs::-webkit-scrollbar {
		display: none;
	}

	.strip-close {
		position: sticky;
		left: 0;
		z-index: 1;
		flex-shrink: 0;
		background: white;
		border: none;
		cursor: pointer;
		font-size: 1.2rem;
		color: #888;
		padding: 0.5rem 0.75rem;
		display: flex;
		align-items: center;
		line-height: 1;
	}

	.strip-close:hover {
		color: #000;
	}

	.strip-tab {
		flex-shrink: 0;
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.875rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #000;
		padding: 0.5rem 0.75rem;
		white-space: nowrap;
		transition: color 0.15s;
	}

	.strip-tab.active {
		color: #000;
		font-weight: 600;
		font-size: 1.05rem;
	}

	.strip-tab:hover {
		color: #555;
	}
</style>
