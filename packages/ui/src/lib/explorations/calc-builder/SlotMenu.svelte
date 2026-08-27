<script lang="ts">
	import { typeClass } from './ast';
	import { OPERATORS } from './operators';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();

	let query = $state('');
	let filterEl = $state<HTMLInputElement | null>(null);

	/* The menu just opened by explicit click; put the keyboard in the filter. */
	$effect(() => {
		filterEl?.focus();
	});

	const q = $derived(query.trim().toLowerCase());
	const matches = (...terms: string[]): boolean =>
		q === '' || terms.some((term) => term.toLowerCase().includes(q));

	const visibleSuggestions = $derived(store.suggestions.filter((value) => matches(value)));
	const visibleLibrary = $derived(
		store.modelLibrary.filter(
			(entry) =>
				entry.produces !== null &&
				store.canFill(entry.produces) &&
				matches(entry.version.label, entry.def.id)
		)
	);
	const fields = $derived(
		[
			...store.scopeFields,
			...store.model.fields.filter((f) => !store.scopeFields.some((s) => s.id === f.id))
		].filter((field) => store.canFill(field.type))
	);
	const visibleFields = $derived(fields.filter((field) => matches(field.id)));
	const showSwitch = $derived(store.selectedPath !== null && matches('switch', 'case'));
	const showMap = $derived(store.canFill('number[]') && matches('map', 'each'));
	const visibleOperators = $derived(
		OPERATORS.filter((def) => store.canFill(def.result) && matches(def.label, def.id, def.symbol))
	);
	const showNumberLiteral = $derived(store.canFill('number') && matches('number', 'literal'));
	const showBooleanLiteral = $derived(
		store.canFill('boolean') && matches('true', 'false', 'boolean', 'literal')
	);
	const showStringLiteral = $derived(
		store.canFill('string') && matches('text', 'string', 'literal')
	);
	const empty = $derived(
		visibleSuggestions.length === 0 &&
			visibleLibrary.length === 0 &&
			visibleFields.length === 0 &&
			!showSwitch &&
			!showMap &&
			visibleOperators.length === 0 &&
			!showNumberLiteral &&
			!showBooleanLiteral &&
			!showStringLiteral
	);

	/** Enter with a query picks the first visible match, in render order. */
	const pickFirst = () => {
		if (q === '') return;
		const suggestion = visibleSuggestions[0];
		if (suggestion !== undefined) {
			store.fillLiteral({ kind: 'literal', type: 'string', value: suggestion });
			return;
		}
		if (visibleLibrary[0]) return store.fillCalc(visibleLibrary[0].def.id);
		if (visibleFields[0]) return store.fillField(visibleFields[0].id);
		if (showSwitch) return store.fillSwitch();
		if (showMap) return store.fillMap();
		if (visibleOperators[0]) return store.fillOperator(visibleOperators[0].id);
	};

	const onFilterKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') pickFirst();
		if (e.key === 'Escape') {
			e.stopPropagation();
			store.closeMenu();
		}
	};

	let numberInput = $state<number | string>(0);
	let stringText = $state('');
	const numberValue = $derived.by(() => {
		const raw = typeof numberInput === 'number' ? numberInput : Number(numberInput.trim() || NaN);
		return Number.isFinite(raw) ? raw : null;
	});
	const useNumber = () => {
		if (numberValue === null) return;
		store.fillLiteral({ kind: 'literal', type: 'number', value: numberValue });
	};
	const useString = () => store.fillLiteral({ kind: 'literal', type: 'string', value: stringText });
</script>

<div class="slot-menu" data-slot-menu>
	<input
		class="menu-filter"
		type="text"
		placeholder="type to filter…"
		aria-label="Filter options"
		bind:this={filterEl}
		bind:value={query}
		onkeydown={onFilterKeydown}
	/>

	{#if visibleSuggestions.length > 0}
		<div class="menu-label">Suggestions</div>
		{#each visibleSuggestions as suggestion (suggestion)}
			<button
				class="menu-item mono"
				data-menu-suggestion={suggestion}
				onclick={() => store.fillLiteral({ kind: 'literal', type: 'string', value: suggestion })}
			>
				"{suggestion}"
			</button>
		{/each}
	{/if}

	{#if visibleLibrary.length > 0}
		<div class="menu-label">Library</div>
		{#each visibleLibrary as entry (entry.def.id)}
			<button
				class="menu-item"
				data-menu-calc={entry.def.id}
				onclick={() => store.fillCalc(entry.def.id)}
			>
				<span><i>ƒ</i> {entry.version.label}</span>
				{#if entry.produces !== null}
					<span class="type-badge t-{typeClass(entry.produces)}">{entry.produces}</span>
				{/if}
			</button>
		{/each}
	{/if}

	{#if visibleFields.length > 0}
		<div class="menu-label">Fields</div>
		{#each visibleFields as field (field.id)}
			<button
				class="menu-item"
				data-menu-field={field.id}
				onclick={() => store.fillField(field.id)}
			>
				<span class="mono">{field.id}</span>
				<span class="type-badge t-{typeClass(field.type)}">{field.type}</span>
			</button>
		{/each}
	{/if}

	{#if showSwitch || showMap || visibleOperators.length > 0}
		<div class="menu-label">Operators</div>
	{/if}
	{#if showSwitch}
		<button class="menu-item" data-menu-op="switch" onclick={() => store.fillSwitch()}>
			<span><b>switch</b> Switch / case</span>
		</button>
	{/if}
	{#if showMap}
		<button class="menu-item" data-menu-op="map" onclick={() => store.fillMap()}>
			<span><b>map</b> Map each</span>
			<span class="type-badge t-array">number[]</span>
		</button>
	{/if}
	{#each visibleOperators as def (def.id)}
		<button class="menu-item" data-menu-op={def.id} onclick={() => store.fillOperator(def.id)}>
			<span><b>{def.symbol}</b> {def.label}</span>
			<span class="type-badge t-{typeClass(def.result)}">{def.result}</span>
		</button>
	{/each}

	{#if showNumberLiteral || showBooleanLiteral || showStringLiteral}
		<div class="menu-label">Literal</div>
		{#if showNumberLiteral}
			<div class="menu-row">
				<input
					type="number"
					step="any"
					bind:value={numberInput}
					aria-label="Number literal (menu)"
					onkeydown={(e) => e.key === 'Enter' && useNumber()}
				/>
				<button
					class="tool-btn"
					data-menu-literal="number"
					disabled={numberValue === null}
					onclick={useNumber}
				>
					Use
				</button>
			</div>
		{/if}
		{#if showBooleanLiteral}
			<div class="menu-row">
				<button
					class="tool-btn"
					data-menu-literal="true"
					onclick={() => store.fillLiteral({ kind: 'literal', type: 'boolean', value: true })}
				>
					true
				</button>
				<button
					class="tool-btn"
					data-menu-literal="false"
					onclick={() => store.fillLiteral({ kind: 'literal', type: 'boolean', value: false })}
				>
					false
				</button>
			</div>
		{/if}
		{#if showStringLiteral}
			<div class="menu-row">
				<input
					type="text"
					placeholder="text"
					bind:value={stringText}
					aria-label="Text literal (menu)"
					onkeydown={(e) => e.key === 'Enter' && useString()}
				/>
				<button class="tool-btn" data-menu-literal="string" onclick={useString}>Use</button>
			</div>
		{/if}
	{/if}

	{#if empty}
		<p class="menu-empty">Nothing matches "{query}"</p>
	{/if}
</div>

<style>
	.slot-menu {
		position: absolute;
		top: calc(100% + 0.35rem);
		left: 0;
		z-index: 20;
		min-width: 15rem;
		max-height: 19rem;
		overflow-y: auto;
		padding: 0.4rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 0.5rem;
		background: var(--color-bg);
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.14);
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		text-align: left;
	}
	.menu-filter {
		width: 100%;
		box-sizing: border-box;
		padding: 0.3rem 0.45rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.3rem;
		background: none;
		color: var(--color-text);
		font: inherit;
		font-size: 0.82rem;
		margin-bottom: 0.2rem;
	}
	.menu-filter:focus {
		outline: none;
		border-color: var(--cb-accent);
	}
	.menu-label {
		font-size: 0.62rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin: 0.35rem 0.35rem 0.1rem;
	}
	.menu-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.28rem 0.45rem;
		border: none;
		border-radius: 0.3rem;
		background: none;
		font: inherit;
		font-size: 0.82rem;
		color: var(--color-text);
		cursor: pointer;
		text-align: left;
	}
	.menu-item:hover {
		background: var(--color-surface);
	}
	.menu-item b {
		font-weight: 700;
		color: var(--color-text-strong);
	}
	.mono {
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
	}
	.menu-row {
		display: flex;
		gap: 0.35rem;
		padding: 0.15rem 0.35rem;
		align-items: center;
	}
	.menu-row input {
		flex: 1;
		min-width: 0;
		padding: 0.25rem 0.4rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 0.375rem;
		background: none;
		color: var(--color-text);
		font: inherit;
		font-size: 0.82rem;
	}
	.menu-empty {
		margin: 0.2rem 0.35rem 0.3rem;
		font-size: 0.78rem;
		color: var(--color-text-muted);
	}
</style>
