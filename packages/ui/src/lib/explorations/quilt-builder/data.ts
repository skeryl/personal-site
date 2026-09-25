export interface Material {
	id: string;
	name: string;
	hex: string;
}

export interface QuiltSize {
	id: string;
	name: string;
	width: number;
	height: number;
}

/** Finished quilt dimensions in inches; the grid is however many whole blocks fit. */
export const QUILT_SIZES: QuiltSize[] = [
	{ id: 'baby', name: 'Baby', width: 32, height: 48 },
	{ id: 'crib', name: 'Crib', width: 40, height: 48 },
	{ id: 'throw', name: 'Throw', width: 48, height: 64 },
	{ id: 'sq-throw', name: 'Sq. Throw', width: 64, height: 64 },
	{ id: 'twin', name: 'Twin', width: 80, height: 96 },
	{ id: 'full-queen', name: 'Full/Queen', width: 96, height: 112 },
	{ id: 'king', name: 'King', width: 112, height: 112 }
];

export const QUILT_SIZE_BY_ID: Record<string, QuiltSize> = Object.fromEntries(
	QUILT_SIZES.map((size) => [size.id, size])
);

export const DEFAULT_SIZE_ID = 'throw';

/** Not a preset: the width and height live on the design itself. */
export const CUSTOM_SIZE_ID = 'custom';

/** Bounds for a custom quilt, in inches. */
export const MIN_CUSTOM_INCHES = 12;
export const MAX_CUSTOM_INCHES = 200;

export const clampCustomInches = (value: number): number =>
	Math.min(MAX_CUSTOM_INCHES, Math.max(MIN_CUSTOM_INCHES, Math.round(value)));

/*
 * Sizes that existed before the list was reworked, so a saved design keeps a
 * sensible shape instead of snapping back to the default.
 */
export const LEGACY_SIZE_IDS: Record<string, string> = {
	full: 'full-queen',
	queen: 'full-queen'
};

/** Finished block sizes offered, in inches. */
export const BLOCK_SIZES = [4, 6, 8, 10, 12];
export const DEFAULT_BLOCK_SIZE = 8;

/** Seam allowances offered, per side, in inches. */
export const SEAM_ALLOWANCES = [0.25, 0.375, 0.5] as const;
export const DEFAULT_SEAM_INCHES = 0.25;

/** Binding widths offered, in inches. Cut from the fabric, not pieced. */
export const BINDINGS = [0.5, 0.625, 1, 2] as const;
export const DEFAULT_BINDING_INCHES = 0.625;

/*
 * Written in figures, for the dimensions along the top of the palette. The
 * design sets those by raising the numerator against the denominator rather
 * than reaching for a ready-made glyph, so what is drawn is assembled from
 * the parts and the value stays a plain string.
 */
const FRACTIONS: [number, string][] = [
	[0.125, '1/8'],
	[0.25, '1/4'],
	[0.375, '3/8'],
	[0.5, '1/2'],
	[0.625, '5/8'],
	[0.75, '3/4'],
	[0.875, '7/8']
];

export const fmtFraction = (inches: number): string => {
	const whole = Math.floor(inches);
	const part = FRACTIONS.find(([n]) => Math.abs(n - (inches - whole)) < 1e-6)?.[1];
	if (!part) return String(inches);
	return whole ? `${whole} ${part}` : part;
};

/** Starter swatches for new fabrics, cycled so each new one looks distinct. */
export const STARTER_HEXES = ['#4f7fe8', '#38511f', '#c766e4', '#e8b04f', '#d94f4f', '#2f9e8f'];

export const isNamed = (material: Material): boolean => material.name.trim().length > 0;

export const normalizeHex = (raw: string): string | null => {
	const hex = raw.trim().replace(/^#/, '');
	if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
	if (/^[0-9a-f]{3}$/i.test(hex)) {
		return `#${hex
			.split('')
			.map((ch) => ch + ch)
			.join('')
			.toLowerCase()}`;
	}
	return null;
};

const EIGHTHS = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'];

/** Inches to the nearest eighth, as quilters write them: 8.5 -> 8½. */
export const fmtInches = (inches: number): string => {
	const eighths = Math.round(inches * 8);
	const whole = Math.floor(eighths / 8);
	const rem = eighths % 8;
	if (rem === 0) return String(whole);
	return whole === 0 ? EIGHTHS[rem] : `${whole}${EIGHTHS[rem]}`;
};

export const MM_PER_INCH = 25.4;

/**
 * A length as the chosen unit writes it. Inches keep the quilter's eighths;
 * millimetres are whole numbers, which is the precision a rotary cutter and a
 * metric ruler actually offer.
 */
export const fmtLength = (inches: number, metric: boolean): string =>
	metric ? `${Math.round(inches * MM_PER_INCH)}mm` : `${fmtInches(inches)}”`;

/**
 * Two lengths as one measurement — 17 x 9”, 432 x 229mm. The unit is written
 * once, at the end, the way a pattern gives a cut size. The x is held apart
 * from the numbers: run together, a pair of fractions is a wall of glyphs.
 */
export const fmtLengthPair = (w: number, h: number, metric: boolean): string =>
	metric
		? `${Math.round(w * MM_PER_INCH)} x ${Math.round(h * MM_PER_INCH)}mm`
		: `${fmtInches(w)} x ${fmtInches(h)}”`;
