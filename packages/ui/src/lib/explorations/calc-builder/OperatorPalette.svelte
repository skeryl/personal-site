<script lang="ts">
	import { typeClass } from './ast';
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
</script>

<aside class="palette">
	<h3>Operations</h3>
	{#if store.selectedExpected !== null}
		<p class="hint">
			Filling a
			<span class="type-badge t-{typeClass(store.selectedExpected)}">{store.selectedExpected}</span>
			slot. Anything dimmed would not fit.
		</p>
	{:else if store.checkResult.complete}
		<p class="hint">
			Calculation complete. Click a value in the tree to swap it, or × to remove a piece.
		</p>
	{:else}
		<p class="hint">Nothing selected. Click an empty slot in the tree, then fill it from here.</p>
	{/if}

	{#if store.suggestions.length > 0}
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

	{#each CATEGORIES as category (category.id)}
		<div class="group-label">{category.label}</div>
		<div class="ops">
			{#if category.id === 'logic'}
				{@const enabled = store.selectedPath !== null}
				<button
					class="op-btn"
					class:depleted={!enabled}
					aria-disabled={!enabled}
					data-op-id="switch"
					onclick={() => store.fillSwitch()}
					title={enabled ? 'Match a value against cases' : 'Select a slot first'}
				>
					<span class="op-symbol">switch</span>
					<span class="op-name">Switch / case</span>
				</button>
			{/if}
			{#if category.id === 'objects'}
				{@const enabled = store.canFill('number[]')}
				<button
					class="op-btn"
					class:depleted={!enabled}
					aria-disabled={!enabled}
					data-op-id="map"
					onclick={() => store.fillMap()}
					title={enabled
						? 'Evaluate an expression once per element'
						: 'Does not fit the selected slot'}
				>
					<span class="op-symbol">map</span>
					<span class="op-name">Map each</span>
					<span class="type-badge t-array">number[]</span>
				</button>
			{/if}
			{#each OPERATORS.filter((def) => def.category === category.id) as def (def.id)}
				{@const enabled = store.canFill(def.result)}
				<button
					class="op-btn"
					class:depleted={!enabled}
					aria-disabled={!enabled}
					data-op-id={def.id}
					onclick={() => store.fillOperator(def.id)}
					title={enabled ? def.label : 'Does not fit the selected slot'}
				>
					<span class="op-symbol">{def.symbol}</span>
					<span class="op-name">{def.label}</span>
					<span class="type-badge t-{typeClass(def.result)}">{def.result}</span>
				</button>
			{/each}
		</div>
	{/each}

	{#if store.scopeFields.length > 0}
		<div class="group-label">Element fields · map</div>
		<div class="ops">
			{#each store.scopeFields as scopeField (scopeField.id)}
				{@const enabled = store.canFill(scopeField.type)}
				<button
					class="op-btn field"
					class:depleted={!enabled}
					aria-disabled={!enabled}
					data-field-id={scopeField.id}
					onclick={() => store.fillField(scopeField.id)}
					title={enabled
						? `Use ${scopeField.id} from the current element`
						: 'Does not fit the selected slot'}
				>
					<span class="op-name field-name">{scopeField.id}</span>
					<span class="type-badge t-{typeClass(scopeField.type)}">{scopeField.type}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if store.modelLibrary.length > 0}
		<div class="group-label">Library · {store.model.label}</div>
		<div class="ops">
			{#each store.modelLibrary as entry (entry.def.id)}
				{@const enabled = entry.produces !== null && store.canFill(entry.produces)}
				<button
					class="op-btn field"
					class:depleted={!enabled}
					aria-disabled={!enabled}
					data-calc-id={entry.def.id}
					onclick={() => store.fillCalc(entry.def.id)}
					title={enabled ? entry.def.description : 'Does not fit the selected slot'}
				>
					<span class="op-name calc-name">ƒ {entry.version.label}</span>
					{#if entry.produces !== null}
						<span class="type-badge t-{typeClass(entry.produces)}">{entry.produces}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<div class="group-label">Fields · {store.model.label}</div>
	<div class="ops">
		{#each store.model.fields as field (field.id)}
			{@const enabled = store.canFill(field.type)}
			<button
				class="op-btn field"
				class:depleted={!enabled}
				aria-disabled={!enabled}
				data-field-id={field.id}
				onclick={() => store.fillField(field.id)}
				title={enabled ? `Use ${field.label} from the record` : 'Does not fit the selected slot'}
			>
				<span class="op-name field-name">{field.label}</span>
				<span class="type-badge t-{typeClass(field.type)}">{field.type}</span>
			</button>
		{/each}
	</div>

	<div class="group-label">Literals</div>
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
</aside>

<style>
	.palette h3 {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
		color: var(--color-text-heading);
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
</style>
