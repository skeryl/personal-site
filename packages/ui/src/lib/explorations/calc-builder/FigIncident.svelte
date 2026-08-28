<script lang="ts">
	/* Figure: the debugging artifact of the support call, a comparison
	 * spreadsheet assembled from both systems' data. */
	const ROWS: { label: string; desk: string; ours: string; match: boolean }[] = [
		{ label: 'position size', desk: '1,250,000', ours: '1,250,000', match: true },
		{ label: 'avg daily volume', desk: '8,400,000', ours: '8,400,000', match: true },
		{ label: 'rating source', desk: 'refdata-1', ours: 'refdata-2', match: false },
		{ label: 'equalized rating', desk: 'AA', ours: 'A', match: false },
		{ label: 'liquidity score', desk: '0.62', ours: '0.58', match: false },
		{ label: 'verdict', desk: 'proceed', ours: 'BLOCKED', match: false }
	];
</script>

<figure class="fig-incident" data-figure-incident>
	<div class="sheet">
		<div class="formula-bar">
			<span class="cell-ref">D7</span>
			<span class="fx">fx</span>
			<span class="formula">=IF(B7=C7, "TRUE", "FALSE")</span>
		</div>
		<table>
			<thead>
				<tr>
					<th class="corner"></th>
					<th>A</th>
					<th>B</th>
					<th>C</th>
					<th>D</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="rownum">1</td>
					<td class="head">field</td>
					<td class="head">desk system</td>
					<td class="head">surveillance</td>
					<td class="head">match?</td>
				</tr>
				{#each ROWS as row, i (row.label)}
					<tr>
						<td class="rownum">{i + 2}</td>
						<td>{row.label}</td>
						<td class:blocked={row.desk === 'BLOCKED'}>{row.desk}</td>
						<td class:blocked={row.ours === 'BLOCKED'}>{row.ours}</td>
						<td class="match" class:isfalse={!row.match}>{row.match ? 'TRUE' : 'FALSE'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="tabs">
			<span class="tab active">blocked-trade-debug</span>
			<span class="tab">Sheet2</span>
		</div>
	</div>
	<figcaption>
		The artifact of a typical support call: both systems' inputs, reassembled by hand until the
		divergence surfaces. The values agree until the rating source; everything downstream differs.
	</figcaption>
</figure>

<style>
	.fig-incident {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.sheet {
		border: 1px solid var(--color-border-strong);
		border-radius: 0.4rem;
		overflow: hidden;
		background: #fff;
		max-width: 100%;
	}
	.formula-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0.5rem;
		border-bottom: 1px solid var(--color-border-subtle);
		font-family: var(--font-mono, monospace);
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		background: var(--color-surface);
	}
	.cell-ref {
		border: 1px solid var(--color-border-subtle);
		background: #fff;
		padding: 0.05rem 0.5rem;
		border-radius: 0.2rem;
	}
	.fx {
		font-style: italic;
		color: var(--color-text-muted);
	}
	.formula {
		border-left: 1px solid var(--color-border-subtle);
		padding-left: 0.5rem;
	}
	table {
		border-collapse: collapse;
		font-size: 0.78rem;
	}
	th,
	td {
		border: 1px solid #d8dee4;
		padding: 0.28rem 0.7rem;
		text-align: left;
		white-space: nowrap;
	}
	thead th {
		background: var(--color-surface);
		font-weight: 500;
		font-size: 0.68rem;
		color: var(--color-text-muted);
		text-align: center;
		padding: 0.15rem 0.7rem;
	}
	.corner {
		width: 2rem;
	}
	.rownum {
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: 0.68rem;
		text-align: center;
		padding: 0.28rem 0.45rem;
	}
	.head {
		font-weight: 600;
		color: var(--color-text-strong);
		background: color-mix(in srgb, var(--color-surface) 60%, #fff);
	}
	td {
		font-family: var(--font-mono, monospace);
		color: var(--color-text-secondary);
	}
	td.match {
		color: var(--cb-type-boolean);
		text-align: center;
	}
	td.match.isfalse {
		color: var(--cb-error);
		background: color-mix(in srgb, var(--cb-error) 7%, #fff);
		font-weight: 700;
	}
	td.blocked {
		color: var(--cb-error);
		font-weight: 700;
	}
	.tabs {
		display: flex;
		gap: 0.15rem;
		padding: 0.25rem 0.4rem 0.3rem;
		border-top: 1px solid var(--color-border-subtle);
		background: var(--color-surface);
	}
	.tab {
		font-size: 0.66rem;
		padding: 0.1rem 0.6rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.2rem 0.2rem 0 0;
		color: var(--color-text-muted);
		background: var(--color-surface);
	}
	.tab.active {
		background: #fff;
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
	@media (max-width: 560px) {
		table {
			font-size: 0.68rem;
		}
		th,
		td {
			padding: 0.22rem 0.4rem;
		}
	}
</style>
