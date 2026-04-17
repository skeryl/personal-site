export type Color = 'white' | 'black';

export interface RepertoireMove {
	san: string;
	comment?: string;
	weight?: number;
	children?: RepertoireMove[];
}

export interface Repertoire {
	id: string;
	name: string;
	color: Color;
	description?: string;
	startFen?: string;
	root: RepertoireMove[];
}
