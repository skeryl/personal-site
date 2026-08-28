<script lang="ts">
	import { newMapNode, newOpNode, newSwitchNode, typeClass, type CalcNode } from './ast';
	import { OPERATORS, type OperatorCategory } from './operators';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();

	const CATEGORIES: { id: OperatorCategory; label: string }[] = [
		{ id: 'logic', label: 'Logic' },
		{ id: 'compare', label: 'Comparison' },
		{ id: 'arithmetic', label: 'Arithmetic' },
		{ id: 'aggregate', label: 'Aggregation' },
		{ id: 'objects', label: 'Collections' }
	];

	/* bind:value on a number input hands back a number, not a string. */
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
	const useString = () => {
		store.fillLiteral({ kind: 'literal', type: 'string', value: stringText });
	};

	/* Palette entries drag in as copies; valid targets light up in the tree. */
	const dragStart = (e: DragEvent, node: CalcNode) => {
		e.dataTransfer?.setData('text/plain', 'calc-node');
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
		store.startPaletteDrag(node);
	};

	/* Filtering: an active query expands everything and hides empty groups. */
	let filter = $state('');
	const q = $derived(filter.trim().toLowerCase());
	const matches = (...parts: string[]) =>
		q === '' || parts.some((part) => part.toLowerCase().includes(q));

	/* Collapsed group keys: category ids plus scope/library/fields/literals. */
	let collapsed = $state<Record<string, boolean>>({});
	const toggle = (key: string) => (collapsed[key] = !collapsed[key]);
	const open = (key: string) => q !== '' || !collapsed[key];

	const filteredCategories = $derived(
		CATEGORIES.map((category) => ({
			...category,
			hasSwitch: category.id === 'logic' && matches('switch', 'switch / case'),
			hasMap: category.id === 'objects' && matches('map', 'map each'),
			ops: OPERATORS.filter(
				(def) => def.category === category.id && matches(def.id, def.label, def.symbol)
			)
		})).map((category) => ({
			...category,
			count: category.ops.length + (category.hasSwitch ? 1 : 0) + (category.hasMap ? 1 : 0)
		}))
	);
	const filteredScope = $derived(
		store.scopeFields.filter((field) => matches(field.id, field.type))
	);
	const filteredLibrary = $derived(
		store.modelLibrary.filter((entry) => matches(entry.def.id, entry.version.label))
	);
	const filteredFields = $derived(
		store.model.fields.filter((field) => matches(field.id, field.label, field.type))
	);
</script>

<aside class="palette">
	<div class="palette-top">
		<h3>Operations</h3>
		{#if store.selectedExpected !== null}
			<p class="hint">
				Filling a
				<span class="type-badge t-{typeClass(store.selectedExpected)}"
					>{store.selectedExpected}</span
				>
				slot. Anything dimmed would not fit.
			</p>
		{:else if store.checkResult.complete}
			<p class="hint">
				Calculation complete. Click a value in the tree to swap it, drag nodes to rearrange, or drag
				an operation onto a node to wrap it.
			</p>
		{:else}
			<p class="hint">
				Nothing selected. Click an empty slot to fill it from here, or drag anything straight into
				the tree.
			</p>
		{/if}
		<input
			class="palette-filter"
			type="text"
			placeholder="Filter operations…"
			aria-label="Filter operations"
			data-palette-filter
			bind:value={filter}
		/>
	</div>

	{#if store.suggestions.length > 0 && q === ''}
		<div class="group-label">Suggestions</div>
		<div class="ops">
			{#each store.suggestions as suggestion (suggestion)}
				<button
					class="op-btn suggestion"
					data-suggestion={suggestion}
					onclick={() => store.fillLiteral({ kind: 'literal', type: 'string', value: suggestion })}
					title={`Use "${suggestion}" here`}
				>
					"{suggestion}"
				</button>
			{/each}
		</div>
	{/if}

	{#each filteredCategories as category (category.id)}
		{#if q === '' || category.count > 0}
			<button
				class="group-label group-toggle"
				data-group-toggle={category.id}
				onclick={() => toggle(category.id)}
			>
				<span class="chev" class:openc={open(category.id)}>▸</span>
				{category.label}
			</button>
			{#if open(category.id)}
				<div class="ops" data-group={category.id}>
					{#if category.hasSwitch}
						<button
							class="op-btn"
							data-op-id="switch"
							draggable="true"
							ondragstart={(e) => dragStart(e, newSwitchNode())}
							ondragend={() => store.endDrag()}
							onclick={() => store.fillSwitch()}
							title="Match a value against cases; click a slot or drag it in"
						>
							<span class="op-symbol">switch</span>
							<span class="op-name">Switch / case</span>
						</button>
					{/if}
					{#if category.hasMap}
						{@const dimmed = store.selectedExpected !== null && !store.canFill('number[]')}
						<button
							class="op-btn"
							class:depleted={dimmed}
							aria-disabled={dimmed}
							data-op-id="map"
							draggable="true"
							ondragstart={(e) => dragStart(e, newMapNode())}
							ondragend={() => store.endDrag()}
							onclick={() => store.fillMap()}
							title={dimmed
								? 'Does not fit the selected slot; drag it where it belongs'
								: 'Evaluate an expression once per element'}
						>
							<span class="op-symbol">map</span>
							<span class="op-name">Map each</span>
							<span class="type-badge t-array">number[]</span>
						</button>
					{/if}
					{#each category.ops as def (def.id)}
						{@const dimmed = store.selectedExpected !== null && !store.canFill(def.result)}
						<button
							class="op-btn"
							class:depleted={dimmed}
							aria-disabled={dimmed}
							data-op-id={def.id}
							draggable="true"
							ondragstart={(e) => dragStart(e, newOpNode(def.id))}
							ondragend={() => store.endDrag()}
							onclick={() => store.fillOperator(def.id)}
							title={dimmed
								? 'Does not fit the selected slot; drag it where it belongs'
								: def.label}
						>
							<span class="op-symbol">{def.symbol}</span>
							<span class="op-name">{def.label}</span>
							<span class="type-badge t-{typeClass(def.result)}">{def.result}</span>
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	{/each}

	{#if filteredScope.length > 0}
		<button
			class="group-label group-toggle"
			data-group-toggle="scope"
			onclick={() => toggle('scope')}
		>
			<span class="chev" class:openc={open('scope')}>▸</span>
			Element fields · map
		</button>
		{#if open('scope')}
			<div class="ops">
				{#each filteredScope as scopeField (scopeField.id)}
					{@const dimmed = store.selectedExpected !== null && !store.canFill(scopeField.type)}
					<button
						class="op-btn field"
						class:depleted={dimmed}
						aria-disabled={dimmed}
						data-field-id={scopeField.id}
						draggable="true"
						ondragstart={(e) => dragStart(e, { kind: 'field', field: scopeField.id })}
						ondragend={() => store.endDrag()}
						onclick={() => store.fillField(scopeField.id)}
						title={dimmed
							? 'Does not fit the selected slot; drag it where it belongs'
							: `Use ${scopeField.id} from the current element`}
					>
						<span class="op-name field-name">{scopeField.id}</span>
						<span class="type-badge t-{typeClass(scopeField.type)}">{scopeField.type}</span>
					</button>
				{/each}
			</div>
		{/if}
	{/if}

	{#if filteredLibrary.length > 0}
		<button
			class="group-label group-toggle"
			data-group-toggle="library"
			onclick={() => toggle('library')}
		>
			<span class="chev" class:openc={open('library')}>▸</span>
			Library · {store.model.label}
		</button>
		{#if open('library')}
			<div class="ops">
				{#each filteredLibrary as entry (entry.def.id)}
					{@const dimmed =
						store.selectedExpected !== null &&
						!(entry.produces !== null && store.canFill(entry.produces))}
					<button
						class="op-btn field"
						class:depleted={dimmed}
						aria-disabled={dimmed}
						data-calc-id={entry.def.id}
						draggable="true"
						ondragstart={(e) => dragStart(e, { kind: 'calc', calcId: entry.def.id })}
						ondragend={() => store.endDrag()}
						onclick={() => store.fillCalc(entry.def.id)}
						title={dimmed
							? 'Does not fit the selected slot; drag it where it belongs'
							: entry.def.description}
					>
						<span class="op-name calc-name">ƒ {entry.version.label}</span>
						{#if entry.produces !== null}
							<span class="type-badge t-{typeClass(entry.produces)}">{entry.produces}</span>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	{/if}

	{#if q === '' || filteredFields.length > 0}
		<button
			class="group-label group-toggle"
			data-group-toggle="fields"
			onclick={() => toggle('fields')}
		>
			<span class="chev" class:openc={open('fields')}>▸</span>
			Fields · {store.model.label}
		</button>
		{#if open('fields')}
			<div class="ops">
				{#each filteredFields as field (field.id)}
					{@const dimmed = store.selectedExpected !== null && !store.canFill(field.type)}
					<button
						class="op-btn field"
						class:depleted={dimmed}
						aria-disabled={dimmed}
						data-field-id={field.id}
						draggable="true"
						ondragstart={(e) => dragStart(e, { kind: 'field', field: field.id })}
						ondragend={() => store.endDrag()}
						onclick={() => store.fillField(field.id)}
						title={dimmed
							? 'Does not fit the selected slot; drag it where it belongs'
							: `Use ${field.label} from the record`}
					>
						<span class="op-name field-name">{field.label}</span>
						<span class="type-badge t-{typeClass(field.type)}">{field.type}</span>
					</button>
				{/each}
			</div>
		{/if}
	{/if}

	{#if q === ''}
		<button
			class="group-label group-toggle"
			data-group-toggle="literals"
			onclick={() => toggle('literals')}
		>
			<span class="chev" class:openc={open('literals')}>▸</span>
			Literals
		</button>
		{#if open('literals')}
			<div class="literal-row" class:depleted={!store.canFill('number')}>
				<input
					type="number"
					step="any"
					bind:value={numberInput}
					aria-label="Number literal"
					onkeydown={(e) => e.key === 'Enter' && useNumber()}
				/>
				<button
					class="tool-btn"
					data-literal="number"
					disabled={!store.canFill('number') || numberValue === null}
					onclick={useNumber}
				>
					Use
				</button>
			</div>
			<div class="literal-row" class:depleted={!store.canFill('boolean')}>
				<button
					class="tool-btn"
					data-literal="true"
					disabled={!store.canFill('boolean')}
					onclick={() => store.fillLiteral({ kind: 'literal', type: 'boolean', value: true })}
				>
					true
				</button>
				<button
					class="tool-btn"
					data-literal="false"
					disabled={!store.canFill('boolean')}
					onclick={() => store.fillLiteral({ kind: 'literal', type: 'boolean', value: false })}
				>
					false
				</button>
			</div>
			<div class="literal-row" class:depleted={!store.canFill('string')}>
				<input
					type="text"
					placeholder="text"
					bind:value={stringText}
					aria-label="Text literal"
					onkeydown={(e) => e.key === 'Enter' && store.canFill('string') && useString()}
				/>
				<button
					class="tool-btn"
					data-literal="string"
					disabled={!store.canFill('string')}
					onclick={useString}
				>
					Use
				</button>
			</div>
		{/if}
	{/if}
</aside>

<style>
	.palette {
		/* Clears the site's fixed nav when the page (not the deck) scrolls. */
		position: sticky;
		top: 4rem;
		max-height: calc(100vh - 4.5rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding-right: 0.35rem;
	}
	.palette-top {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--color-bg);
		padding-bottom: 0.4rem;
	}
	.palette h3 {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
		color: var(--color-text-heading);
	}
	.palette-filter {
		width: 100%;
		box-sizing: border-box;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.3rem 0.55rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.375rem;
		background: none;
		color: inherit;
	}
	.palette-filter:focus {
		outline: none;
		border-color: var(--cb-accent);
	}
	.group-toggle {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		width: 100%;
		border: none;
		background: none;
		padding: 0.15rem 0;
		cursor: pointer;
		text-align: left;
	}
	.chev {
		display: inline-block;
		font-size: 0.6rem;
		color: var(--color-text-muted);
		transition: transform 0.12s ease;
	}
	.chev.openc {
		transform: rotate(90deg);
	}
	.ops {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0.4rem;
	}
	.op-btn {
		display: grid;
		grid-template-columns: minmax(2.2rem, auto) 1fr auto;
		align-items: center;
		gap: 0.45rem;
		padding: 0.3rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.82rem;
		text-align: left;
		cursor: pointer;
	}
	.op-btn.field {
		grid-template-columns: 1fr auto;
	}
	.op-btn:hover {
		background: var(--color-surface-active);
	}
	/* Type-gated entries need a non-color cue on top of the dimming. */
	.op-btn.depleted {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.op-btn.suggestion {
		grid-template-columns: 1fr;
		border-color: var(--cb-accent);
		color: var(--color-text-strong);
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
	}
	.op-symbol {
		font-weight: 700;
		color: var(--color-text-strong);
	}
	.op-name {
		color: var(--color-text-secondary);
		font-size: 0.78rem;
	}
	.field-name {
		font-family: var(--font-mono, monospace);
	}
	.calc-name {
		font-style: italic;
	}
	.literal-row {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.4rem;
		align-items: center;
	}
	.literal-row.depleted {
		opacity: 0.4;
	}
	.literal-row input {
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
	@media (max-width: 768px) {
		.palette {
			position: static;
			max-height: none;
			overflow: visible;
		}
	}
</style>
