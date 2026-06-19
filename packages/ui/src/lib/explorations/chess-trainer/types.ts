export type Color = 'white' | 'black';

export interface StrategicConcept {
	concept: string;
	explanation: string;
}

export interface RepertoireMove {
	san: string;
	comment?: string;
	source?: string;
	sourceQuote?: string;
	weight?: number;
	children?: RepertoireMove[];
}

export interface Repertoire {
	id: string;
	name: string;
	aliases?: string[];
	ecoCode?: string;
	color: Color;
	description?: string;
	historicalContext?: string;
	strategicConcepts?: StrategicConcept[];
	startFen?: string;
	root: RepertoireMove[];
}
