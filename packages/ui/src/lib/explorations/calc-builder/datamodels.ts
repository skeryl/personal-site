/*
 * Toy finance data models the calculations bind to, plus the sample records
 * the results panel evaluates against.
 */

import type { ValueType } from './ast';
import type { Value } from './operators';

export type DataModelId = 'trading-position' | 'order-book' | 'portfolio-account';

export interface FieldDef {
	/** Dot paths address nested reference data, e.g. 'instrument.couponRate'. */
	id: string;
	label: string;
	type: ValueType;
	/** Shape of each entry when type is 'object[]' (scalar fields only). */
	elementFields?: { id: string; type: 'number' | 'boolean' | 'string' }[];
}

export interface SampleRecord {
	id: string;
	label: string;
	values: Record<string, Value>;
}

export interface DataModel {
	id: DataModelId;
	label: string;
	description: string;
	fields: FieldDef[];
	samples: SampleRecord[];
}

export const MODELS: DataModel[] = [
	{
		id: 'trading-position',
		label: 'Trading Position',
		description:
			'A single holding plus its underlying instrument: reference data and agency credit ratings.',
		fields: [
			{ id: 'symbol', label: 'symbol', type: 'string' },
			{ id: 'price', label: 'price', type: 'number' },
			{ id: 'quantity', label: 'quantity', type: 'number' },
			{ id: 'costBasis', label: 'costBasis', type: 'number' },
			{ id: 'dailyReturns', label: 'dailyReturns', type: 'number[]' },
			{ id: 'instrument.name', label: 'instrument.name', type: 'string' },
			{ id: 'instrument.sector', label: 'instrument.sector', type: 'string' },
			{ id: 'instrument.couponRate', label: 'instrument.couponRate', type: 'number' },
			{
				id: 'instrument.creditRatings',
				label: 'instrument.creditRatings',
				type: 'object[]',
				elementFields: [
					{ id: 'agency', type: 'string' },
					{ id: 'rating', type: 'string' },
					{ id: 'score', type: 'number' }
				]
			}
		],
		samples: [
			{
				id: 'aapl',
				label: 'AAPL',
				values: {
					symbol: 'AAPL',
					price: 187.5,
					quantity: 40,
					costBasis: 150,
					dailyReturns: [1, 2, 3],
					instrument: {
						name: 'Apple Inc.',
						sector: 'tech',
						couponRate: 0,
						creditRatings: [
							{ agency: 'moodys', rating: 'AA', score: 20 },
							{ agency: 'sp', rating: 'AA', score: 19 },
							{ agency: 'fitch', rating: 'A', score: 18 }
						]
					}
				}
			},
			{
				id: 'tsla',
				label: 'TSLA',
				values: {
					symbol: 'TSLA',
					price: 250,
					quantity: 10,
					costBasis: 300,
					dailyReturns: [-2, -1, 0, 3],
					instrument: {
						name: 'Tesla Inc.',
						sector: 'auto',
						couponRate: 0,
						creditRatings: [
							{ agency: 'moodys', rating: 'BB', score: 11 },
							{ agency: 'sp', rating: 'BBB', score: 13 }
						]
					}
				}
			},
			{
				id: 'bnd',
				label: 'BND',
				values: {
					symbol: 'BND',
					price: 80,
					quantity: 100,
					costBasis: 80,
					dailyReturns: [],
					instrument: {
						name: 'Total Bond Market ETF',
						sector: 'bond-fund',
						couponRate: 3.5,
						creditRatings: []
					}
				}
			}
		]
	},
	{
		id: 'order-book',
		label: 'Order Book',
		description: 'A snapshot of one symbol: mid price, spread, and resting order sizes.',
		fields: [
			{ id: 'symbol', label: 'symbol', type: 'string' },
			{ id: 'midPrice', label: 'midPrice', type: 'number' },
			{ id: 'spread', label: 'spread', type: 'number' },
			{ id: 'bidSizes', label: 'bidSizes', type: 'number[]' },
			{ id: 'askSizes', label: 'askSizes', type: 'number[]' }
		],
		samples: [
			{
				id: 'aapl-book',
				label: 'AAPL book',
				values: {
					symbol: 'AAPL',
					midPrice: 187.5,
					spread: 0.02,
					bidSizes: [100, 200, 300],
					askSizes: [150, 250]
				}
			},
			{
				id: 'tsla-book',
				label: 'TSLA book',
				values: {
					symbol: 'TSLA',
					midPrice: 250,
					spread: 0.1,
					bidSizes: [50, 50],
					askSizes: [80, 120, 200]
				}
			},
			{
				id: 'meme-book',
				label: 'MEME book',
				values: { symbol: 'MEME', midPrice: 5, spread: 0.5, bidSizes: [], askSizes: [10000] }
			}
		]
	},
	{
		id: 'portfolio-account',
		label: 'Portfolio Account',
		description: 'A whole account: cash, margin in use, and per-position market values.',
		fields: [
			{ id: 'accountType', label: 'accountType', type: 'string' },
			{ id: 'cashBalance', label: 'cashBalance', type: 'number' },
			{ id: 'marginUsed', label: 'marginUsed', type: 'number' },
			{ id: 'positionValues', label: 'positionValues', type: 'number[]' }
		],
		samples: [
			{
				id: 'margin-acct',
				label: 'Margin account',
				values: {
					accountType: 'margin',
					cashBalance: 25000,
					marginUsed: 12000,
					positionValues: [7500, 2500, 8000]
				}
			},
			{
				id: 'cash-acct',
				label: 'Cash account',
				values: {
					accountType: 'cash',
					cashBalance: 5000,
					marginUsed: 0,
					positionValues: [1200, 800]
				}
			},
			{
				id: 'fresh-acct',
				label: 'Fresh account',
				values: { accountType: 'cash', cashBalance: 1000, marginUsed: 0, positionValues: [] }
			}
		]
	}
];

export const MODEL_BY_ID = Object.fromEntries(MODELS.map((model) => [model.id, model])) as Record<
	DataModelId,
	DataModel
>;
