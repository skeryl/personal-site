<script lang="ts">
	import SlotMenu from './SlotMenu.svelte';
	import SlotOrNode from './SlotOrNode.svelte';
	import { pathKey, typeClass, type CalcNode, type NodePath } from './ast';
	import { OPERATOR_BY_ID, type OperatorId } from './operators';
	import type { CalcStore } from './state.svelte';
	import { effectiveVersion } from './library';
	import { compatibleOperators, resultTypeOf } from './typecheck';

	let { store, node, path }: { store: CalcStore; node: CalcNode; path: NodePath } = $props();

	const key = $derived(pathKey(path));
	const resultType = $derived(resultTypeOf(node, store.model, [], store.library));
	const accent = $derived(
		resultType === null ? 'var(--color-border-strong)' : `var(--cb-type-${typeClass(resultType)})`
	);

	const fmtLiteral = (value: number | boolean | string): string =>
		typeof value === 'string' ? `"${value}"` : String(value);

	const labelOf = (calcId: string): string => {
		const def = store.library.find((entry) => entry.id === calcId);
		return def ? effectiveVersion(def).label : `@${calcId}`;
	};

	const leafLabel = (leaf: CalcNode): string => {
		if (leaf.kind === 'field') return leaf.field;
		if (leaf.kind === 'calc') return labelOf(leaf.calcId);
		return leaf.kind === 'literal' ? fmtLiteral(leaf.value) : '';
	};

	/* The old prettier parser chokes on `as` casts in template expressions. */
	const onOpChange = (e: Event) => {
		store.changeOperator(path, (e.currentTarget as HTMLSelectElement).value as OperatorId);
	};
</script>

{#if node.kind === 'field' || node.kind === 'literal' || node.kind === 'calc'}
	<span
		class="leaf"
		class:selected={store.selectedKey === key}
		class:debug={store.debugKey === key}
		class:calc={node.kind === 'calc'}
		style="border-left-color: {accent}"
		data-node-path={key}
	>
		<button class="leaf-btn" onclick={() => store.openMenu(path)} title="Click to replace">
			{#if node.kind === 'calc'}<span class="calc-mark">ƒ</span>{/if}
			<span class="leaf-label">{leafLabel(node)}</span>
			{#if resultType !== null}
				<span class="type-badge t-{typeClass(resultType)}">
					{resultType}
				</span>
			{/if}
		</button>
		<button class="remove" data-remove={key} onclick={() => store.remove(path)} title="Remove">
			×
		</button>
		{#if store.menuOpen && store.selectedKey === key}
			<SlotMenu {store} />
		{/if}
	</span>
{:else if node.kind === 'op'}
	{@const def = OPERATOR_BY_ID[node.op]}
	{@const variadic = def.arity.kind === 'variadic' ? def.arity : null}
	{@const swappable = compatibleOperators(store.root, path, store.model, store.library)}
	<div
		class="node"
		class:debug={store.debugKey === key}
		style="border-left-color: {accent}"
		data-node-path={key}
	>
		<div class="node-head">
			{#if swappable.length > 1}
				<select
					class="op-select"
					data-op-select={key}
					value={node.op}
					title="Swap for a compatible operator"
					onchange={onOpChange}
				>
					{#each swappable as id (id)}
						<option value={id}>{OPERATOR_BY_ID[id].symbol} · {OPERATOR_BY_ID[id].label}</option>
					{/each}
				</select>
			{:else}
				<span class="op-symbol">{def.symbol}</span>
				<span class="op-name">{def.label}</span>
			{/if}
			<button class="remove" data-remove={key} onclick={() => store.remove(path)} title="Remove">
				×
			</button>
		</div>
		<div class="children">
			{#each node.inputs as input, index (index)}
				<div class="child-row">
					{#if def.inputLabels?.[index]}
						<span class="kw">{def.inputLabels[index]}</span>
					{/if}
					<SlotOrNode {store} child={input} path={[...path, { part: 'input', index }]} />
					{#if variadic && node.inputs.length > variadic.min}
						<button
							class="remove"
							data-remove-input="{key}:{index}"
							onclick={() => store.removeInput(path, index)}
							title="Remove this input"
						>
							×
						</button>
					{/if}
				</div>
			{/each}
			{#if variadic}
				<button class="tool-btn" data-add-input={key} onclick={() => store.addInput(path)}>
					+ input
				</button>
			{/if}
		</div>
	</div>
{:else if node.kind === 'map'}
	<div
		class="node"
		class:debug={store.debugKey === key}
		style="border-left-color: {accent}"
		data-node-path={key}
	>
		<div class="node-head">
			<span class="op-symbol">map</span>
			<span class="op-name">Map each</span>
			<button class="remove" data-remove={key} onclick={() => store.remove(path)} title="Remove">
				×
			</button>
		</div>
		<div class="children">
			<div class="child-row">
				<span class="kw">over</span>
				<SlotOrNode {store} child={node.source} path={[...path, { part: 'source' }]} />
			</div>
			<div class="child-row">
				<span class="kw">to</span>
				<SlotOrNode {store} child={node.body} path={[...path, { part: 'body' }]} />
			</div>
		</div>
	</div>
{:else}
	<div
		class="node"
		class:debug={store.debugKey === key}
		style="border-left-color: {accent}"
		data-node-path={key}
	>
		<div class="node-head">
			<span class="op-symbol">switch</span>
			<button class="remove" data-remove={key} onclick={() => store.remove(path)} title="Remove">
				×
			</button>
		</div>
		<div class="children">
			<div class="child-row">
				<span class="kw">on</span>
				<SlotOrNode {store} child={node.on} path={[...path, { part: 'on' }]} />
			</div>
			{#each node.cases as branch, index (index)}
				<div class="child-row case">
					<span class="kw">when</span>
					<SlotOrNode {store} child={branch.when} path={[...path, { part: 'case-when', index }]} />
					<span class="kw">then</span>
					<SlotOrNode {store} child={branch.then} path={[...path, { part: 'case-then', index }]} />
					{#if node.cases.length > 1}
						<button
							class="remove"
							data-remove-case="{key}:{index}"
							onclick={() => store.removeSwitchCase(path, index)}
							title="Remove this case"
						>
							×
						</button>
					{/if}
				</div>
			{/each}
			<div class="child-row">
				<span class="kw">otherwise</span>
				<SlotOrNode {store} child={node.fallback} path={[...path, { part: 'fallback' }]} />
			</div>
			<button class="tool-btn" data-add-case={key} onclick={() => store.addSwitchCase(path)}>
				+ case
			</button>
		</div>
	</div>
{/if}

<style>
	.node {
		display: inline-flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--color-border-subtle);
		border-left-width: 3px;
		border-radius: 0.375rem;
		max-width: 100%;
	}
	.node-head {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	.op-symbol {
		font-weight: 700;
		color: var(--color-text-strong);
	}
	.op-select {
		font: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-strong);
		background: none;
		border: 1px solid transparent;
		border-radius: 0.25rem;
		padding: 0.05rem 0.2rem;
		cursor: pointer;
		max-width: 12rem;
	}
	.op-select:hover,
	.op-select:focus-visible {
		border-color: var(--color-border-strong);
	}
	.op-name {
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}
	.children {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
		padding-left: 0.75rem;
	}
	.child-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.kw {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
	}
	.leaf {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--color-border-subtle);
		border-left-width: 3px;
		border-radius: 0.375rem;
		font-size: 0.85rem;
	}
	.leaf.selected {
		border-color: var(--cb-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-accent) 30%, transparent);
	}
	.leaf-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: none;
		background: none;
		font: inherit;
		padding: 0;
		cursor: pointer;
	}
	.leaf-btn:hover .leaf-label {
		text-decoration: underline dotted;
	}
	.leaf-label {
		color: var(--color-text-strong);
	}
	.leaf.calc {
		background: var(--color-surface-active);
	}
	.calc-mark {
		font-style: italic;
		font-weight: 700;
		color: var(--cb-accent);
	}
	.remove {
		margin-left: auto;
		border: none;
		background: none;
		font: inherit;
		font-size: 0.85rem;
		line-height: 1;
		padding: 0 0.15rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.remove:hover {
		color: var(--color-text-strong);
	}
	.tool-btn {
		align-self: flex-start;
	}
	.node.debug,
	.leaf.debug {
		box-shadow: 0 0 0 2px var(--cb-accent);
		background: color-mix(in srgb, var(--cb-accent) 8%, transparent);
	}
</style>
