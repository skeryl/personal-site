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
	{ id: 'baby', name: 'Baby', width: 36, height: 48 },
	{ id: 'throw', name: 'Throw', width: 56, height: 72 },
	{ id: 'twin', name: 'Twin', width: 72, height: 96 },
	{ id: 'full', name: 'Full', width: 84, height: 96 },
	{ id: 'queen', name: 'Queen', width: 96, height: 104 },
	{ id: 'king', name: 'King', width: 112, height: 112 }
];

export const QUILT_SIZE_BY_ID: Record<string, QuiltSize> = Object.fromEntries(
	QUILT_SIZES.map((size) => [size.id, size])
);

export const DEFAULT_SIZE_ID = 'king';

/** Finished block sizes offered, in inches. */
export const BLOCK_SIZES = [4, 6, 8, 10, 12];
export const DEFAULT_BLOCK_SIZE = 8;

/** Seam allowance per side, in inches. */
export const SEAM_INCHES = 0.25;

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
