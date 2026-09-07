/*
 * The calculation library: stored definitions, each with a unique id and a
 * data model it is defined against. Entries load into the editor as examples
 * and, via CalcRef nodes, compose into other calculations (calcs in calcs).
 */

import {
	childSlots,
	type CalcNode,
	type CalcRef,
	type Literal,
	type MapNode,
	type OpNode,
	type SwitchNode
} from './ast';
import type { DataModelId } from './datamodels';
import type { OperatorId } from './operators';

/** One immutable snapshot of a calculation. Saves append; nothing rewrites. */
export interface CalcVersion {
	version: number;
	status: 'draft' | 'published';
	savedAt: number;
	publishedAt?: number;
	label: string;
	modelId: DataModelId;
	root: CalcNode;
}

export interface CalcDef {
	id: string;
	description: string;
	/** Append-only audit trail, ascending by version. */
	versions: CalcVersion[];
}

export const latestVersion = (def: CalcDef): CalcVersion => def.versions[def.versions.length - 1];

export const publishedVersion = (def: CalcDef): CalcVersion | null =>
	[...def.versions].reverse().find((entry) => entry.status === 'published') ?? null;

/** What consumers see: the latest published version, or the latest draft
 * when nothing has been published yet. */
export const effectiveVersion = (def: CalcDef): CalcVersion =>
	publishedVersion(def) ?? latestVersion(def);

/** Built-ins ship as an already-published first version. */
export const BUILT_IN_SAVED_AT = Date.UTC(2026, 7, 27);

const n = (value: number): Literal => ({ kind: 'literal', type: 'number', value });
const s = (value: string): Literal => ({ kind: 'literal', type: 'string', value });
const f = (field: string): CalcNode => ({ kind: 'field', field });
const ref = (calcId: string): CalcRef => ({ kind: 'calc', calcId });
const op = (id: OperatorId, ...inputs: CalcNode[]): OpNode => ({ kind: 'op', op: id, inputs });

const avgCreditScore = op('avg', op('pluck', f('instrument.creditRatings'), s('score')));

const agencyRating = (agency: string): OpNode =>
	op('lookupString', f('instrument.creditRatings'), s('agency'), s(agency), s('rating'));

/** Letter grade to numeric scale, shared by the mapping examples. */
const gradeSwitch = (on: CalcNode): SwitchNode => ({
	kind: 'switch',
	on,
	cases: [
		{ when: s('AAA'), then: n(21) },
		{ when: s('AA'), then: n(19) },
		{ when: s('A'), then: n(17) },
		{ when: s('BBB'), then: n(14) },
		{ when: s('BB'), then: n(11) }
	],
	fallback: n(0)
});

/** Map every rating letter to a number, then average across agencies. */
const gradeMap: MapNode = {
	kind: 'map',
	source: f('instrument.creditRatings'),
	body: gradeSwitch(f('rating'))
};

const builtIn = (
	id: string,
	label: string,
	description: string,
	modelId: DataModelId,
	root: CalcNode
): CalcDef => ({
	id,
	description,
	versions: [
		{
			version: 1,
			status: 'published',
			savedAt: BUILT_IN_SAVED_AT,
			publishedAt: BUILT_IN_SAVED_AT,
			label,
			modelId,
			root
		}
	]
});

export const LIBRARY: CalcDef[] = [
	builtIn(
		'market-value',
		'Market value',
		'price × quantity',
		'trading-position',
		op('mul', f('price'), f('quantity'))
	),
	builtIn(
		'unrealized-pnl',
		'Unrealized P&L',
		'(price − cost basis) × quantity',
		'trading-position',
		op('mul', op('sub', f('price'), f('costBasis')), f('quantity'))
	),
	builtIn(
		'avg-credit-score',
		'Average credit score',
		'mean of the numeric score across all rating agencies',
		'trading-position',
		avgCreditScore
	),
	builtIn(
		'moodys-grade',
		"Moody's rating as a number",
		'look up the letter grade, then map it to a numeric scale',
		'trading-position',
		gradeSwitch(agencyRating('moodys'))
	),
	builtIn(
		'sp-grade',
		'S&P rating as a number',
		"the Moody's grade calc, pointed at S&P",
		'trading-position',
		gradeSwitch(agencyRating('sp'))
	),
	builtIn(
		'fitch-grade',
		'Fitch rating as a number',
		"the Moody's grade calc, pointed at Fitch",
		'trading-position',
		gradeSwitch(agencyRating('fitch'))
	),
	builtIn(
		'consensus-grade',
		'Consensus grade',
		'calcs in calcs: the three agency grade calculations, averaged',
		'trading-position',
		op('avg', ref('moodys-grade'), ref('sp-grade'), ref('fitch-grade'))
	),
	builtIn(
		'avg-rating-grade',
		'Average rating grade',
		'map every letter grade to a number, then average across agencies',
		'trading-position',
		op('avg', gradeMap)
	),
	builtIn(
		'investment-grade',
		'Investment grade?',
		'average credit score at or above the BBB cutoff (13)',
		'trading-position',
		op('gte', avgCreditScore, n(13))
	),
	builtIn(
		'book-imbalance',
		'Order book imbalance',
		'total resting bid size over total ask size',
		'order-book',
		op('div', op('sum', f('bidSizes')), op('sum', f('askSizes')))
	),
	builtIn(
		'net-equity',
		'Net account equity',
		'cash + position values − margin in use',
		'portfolio-account',
		op('sub', op('add', f('cashBalance'), op('sum', f('positionValues'))), f('marginUsed'))
	)
];

const containsRef = (node: CalcNode | null, calcId: string): boolean => {
	if (node === null) return false;
	if (node.kind === 'calc') return node.calcId === calcId;
	return childSlots(node).some(({ child }) => containsRef(child, calcId));
};

/** The library calcs whose effective trees directly reference calcId. */
export const referencesTo = (calcId: string, defs: CalcDef[]): CalcDef[] =>
	defs.filter((def) => def.id !== calcId && containsRef(effectiveVersion(def).root, calcId));

/** Turn a display name into a unique library id. */
export const uniqueCalcId = (label: string, taken: Set<string>): string => {
	const base =
		label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'calc';
	if (!taken.has(base)) return base;
	let suffix = 2;
	while (taken.has(`${base}-${suffix}`)) suffix++;
	return `${base}-${suffix}`;
};
