/*
 * The scrap pile.
 *
 * Everything here is hardcoded on purpose: this is a sandbox for a specific
 * stack of real fabric, not a general-purpose quilt tool. Correct the counts
 * and hex values here and the whole sandbox follows.
 */

export interface Fabric {
	id: string;
	name: string;
	hex: string;
	/** How many 8in squares of this fabric are actually on hand. */
	count: number;
}

/** Finished size of a single square, in inches. */
export const SQUARE_INCHES = 8;

/*
 * Provisional blanket dimensions. Shane's target is 10.5 x 7 squares
 * (84in x 56in); the half row is pending a decision on block configurations,
 * so this is 10 x 7 for now.
 */
export const ROWS = 10;
export const COLS = 7;

/*
 * Colors eyeballed from the reference photo of the scrap pile. Counts are
 * placeholders sized to leave some slack over a 70-square blanket.
 */
export const FABRICS: Fabric[] = [
	{ id: 'teal-deep', name: 'Deep teal', hex: '#103c39', count: 22 },
	{ id: 'teal-mint', name: 'Mint', hex: '#6fcfb6', count: 12 },
	{ id: 'cyan-pale', name: 'Pale cyan', hex: '#cdebec', count: 12 },
	{ id: 'blue-sky', name: 'Sky', hex: '#a9dcea', count: 5 },
	{ id: 'blue-bright', name: 'Bright blue', hex: '#0b62d4', count: 4 },
	{ id: 'orchid', name: 'Orchid', hex: '#e0a9e0', count: 18 },
	{ id: 'cream', name: 'Cream', hex: '#e9e7cb', count: 8 },
	{ id: 'tan', name: 'Tan', hex: '#d9d3c1', count: 21 },
	{ id: 'white', name: 'White', hex: '#ffffff', count: 1 }
];

export const FABRIC_BY_ID: Record<string, Fabric> = Object.fromEntries(
	FABRICS.map((f) => [f.id, f])
);

export const TOTAL_SQUARES = FABRICS.reduce((sum, f) => sum + f.count, 0);

/** Inches formatted for display, e.g. 84 -> `7' 0"`. */
export function inchesToFeet(inches: number): string {
	const feet = Math.floor(inches / 12);
	const rem = inches % 12;
	return rem === 0 ? `${feet}'` : `${feet}' ${rem}"`;
}
