<script lang="ts">
	/* Figure: the same positions read through three classifier calcs.
	 * Groupings are computed for real with the demo's evaluator. */
	import type { CalcNode } from './ast';
	import { MODEL_BY_ID } from './datamodels';
	import { evaluate } from './evaluate';
	import { LIBRARY } from './library';

	const samples = MODEL_BY_ID['trading-position'].samples;

	const sectorLens: CalcNode = { kind: 'field', field: 'instrument.sector' };
	const gradeLens: CalcNode = { kind: 'calc', calcId: 'consensus-grade' };
	const sizeLens: CalcNode = {
		kind: 'switch',
		on: {
			kind: 'op',
			op: 'gte',
			inputs: [
				{ kind: 'calc', calcId: 'market-value' },
				{ kind: 'literal', type: 'number', value: 5000 }
			]
		},
		cases: [
			{
				when: { kind: 'literal', type: 'boolean', value: true },
				then: { kind: 'literal', type: 'string', value: 'large' }
			}
		],
		fallback: { kind: 'literal', type: 'string', value: 'small' }
	};

	const labelFor = (lens: CalcNode, values: (typeof samples)[number]['values']): string => {
		const result = evaluate(lens, values, LIBRARY);
		if (!result.ok) return 'unrated';
		return typeof result.value === 'number' ? `grade ${result.value}` : String(result.value);
	};

	const grouped = (lens: CalcNode): { name: string; symbols: string[] }[] => {
		const groups = new Map<string, string[]>();
		for (const sample of samples) {
			const name = labelFor(lens, sample.values);
			groups.set(name, [...(groups.get(name) ?? []), sample.label]);
		}
		return [...groups.entries()].map(([name, symbols]) => ({ name, symbols }));
	};

	const LENSES = [
		{ title: 'by sector', expr: 'instrument.sector', groups: grouped(sectorLens) },
		{ title: 'by rating', expr: '@consensus-grade', groups: grouped(gradeLens) },
		{
			title: 'by size',
			expr: 'case @market-value >= 5000 when true then "large" otherwise "small"',
			groups: grouped(sizeLens)
		}
	];
</script>

<figure class="fig-lenses" data-figure-lenses>
	<div class="lenses">
		{#each LENSES as lens (lens.title)}
			<div class="lens">
				<div class="lens-title">{lens.title}</div>
				<code class="lens-expr">{lens.expr}</code>
				<div class="groups">
					{#each lens.groups as group (group.name)}
						<div class="group">
							<div class="group-name">{group.name}</div>
							<div class="chips">
								{#each group.symbols as symbol (symbol)}
									<span class="chip">{symbol}</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<figcaption>
		The same positions grouped three ways. Each grouping is computed by the evaluator that powers
		the demo above; each classifier is itself a computed attribute.
	</figcaption>
</figure>

<style>
	.fig-lenses {
		margin: 0;
	}
	.lenses {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		max-width: 46rem;
		margin: 0 auto;
	}
	.lens {
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.5rem;
		padding: 0.7rem 0.8rem;
		background: var(--color-bg);
	}
	.lens-title {
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-text-muted);
	}
	.lens-expr {
		display: block;
		font-family: var(--font-mono, monospace);
		font-size: 0.62rem;
		color: var(--cb-accent);
		margin: 0.25rem 0 0.7rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.group {
		margin-bottom: 0.55rem;
	}
	.group-name {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.chip {
		font-family: var(--font-mono, monospace);
		font-size: 0.72rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 0.3rem;
		padding: 0.08rem 0.4rem;
		color: var(--color-text-strong);
	}
	figcaption {
		max-width: 42rem;
		margin: 1rem auto 0;
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: center;
	}
	@media (max-width: 640px) {
		.lenses {
			grid-template-columns: 1fr;
		}
	}
</style>
