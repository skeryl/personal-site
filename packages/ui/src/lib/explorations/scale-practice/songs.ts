import { Chord, Key, type Song } from '@sc/synth-builder/musicxml';

const cantalopueIsland: Song = {
	title: 'Cataloupe Island',
	key: new Key(-1),
	breakMeasures: 4,
	chords: [
		new Chord('G', 'minor-seventh', [], 3),
		new Chord('G', 'minor-seventh', [], 3),
		new Chord('G', 'minor-seventh', [], 3),
		new Chord('G', 'minor-seventh', [], 3),

		new Chord({ step: 'E', accidental: 'flat' }, 'dominant'),
		new Chord({ step: 'E', accidental: 'flat' }, 'dominant'),
		new Chord({ step: 'E', accidental: 'flat' }, 'dominant'),
		new Chord({ step: 'E', accidental: 'flat' }, 'dominant'),

		new Chord('E', 'minor-seventh'),
		new Chord('E', 'minor-seventh'),
		new Chord('E', 'minor-seventh'),
		new Chord('E', 'minor-seventh'),

		new Chord('G', 'minor-seventh', [], 3),
		new Chord('G', 'minor-seventh', [], 3),
		new Chord('G', 'minor-seventh', [], 3),
		new Chord('G', 'minor-seventh', [], 3)
	]
};

export const halfNelson: Song = {
	title: 'Half Nelson',
	key: new Key(2),
	breakMeasures: 4,
	chords: [
		new Chord('D', 'major-seventh'),
		new Chord('D', 'major-seventh'),
		new Chord('G', 'minor-seventh'),
		new Chord('C', 'dominant'),

		new Chord('D', 'major-seventh'),
		new Chord('D', 'major-seventh'),
		new Chord({ step: 'C', accidental: 'sharp' }, 'minor-seventh'),
		new Chord('C', 'minor-seventh'),

		new Chord({ step: 'B', accidental: 'flat' }, 'major-seventh', undefined, 3),
		new Chord({ step: 'B', accidental: 'flat' }, 'major-seventh', undefined, 3),
		new Chord('B', 'minor-seventh', [], 3),
		new Chord('E', 'dominant'),

		new Chord('E', 'minor-seventh'),
		new Chord('A', 'dominant'),
		[new Chord('D', 'major-seventh'), new Chord('F', 'major-seventh')],
		[
			new Chord({ step: 'B', accidental: 'flat' }, 'major-seventh', undefined, 3),
			new Chord({ step: 'E', accidental: 'flat' }, 'major-seventh')
		]
	]
};

export const boplicity: Song = {
	title: 'Boplicity',
	key: new Key(1),
	breakMeasures: 4,
	chords: [
		new Chord('A', 'minor-seventh', [], 3),
		new Chord('D', 'dominant'),
		new Chord('G', 'major', [], 3),
		new Chord('D', 'minor-seventh'),

		new Chord('C'),
		new Chord('A', 'minor-seventh', [], 3),
		new Chord('D', 'dominant'),
		new Chord('G'),

		new Chord('A', 'minor-seventh', [], 3),
		new Chord('D', 'dominant'),
		new Chord('G', 'major', [], 3),
		new Chord('D', 'minor-seventh'),

		new Chord('C'),
		new Chord('A', 'minor-seventh', [], 3),
		new Chord('D', 'dominant'),
		new Chord('G'),

		//

		[
			new Chord('D', 'minor-seventh'),
			new Chord('G', 'dominant', [], undefined, [{ interval: 5, alter: 1 }])
		],
		[new Chord('D', 'minor-seventh'), new Chord({ step: 'C', accidental: 'sharp' }, 'dominant')],
		new Chord('C'),
		new Chord('C'),

		[
			new Chord('C', 'minor-seventh'),
			new Chord('F', 'dominant', [], undefined, [{ interval: 5, alter: 1 }])
		],
		[new Chord('C', 'minor-seventh'), new Chord('B', 'dominant')],
		[
			new Chord({ step: 'B', accidental: 'flat' }),
			new Chord({ step: 'B', accidental: 'flat' }, 'minor-seventh')
		],
		[new Chord('A', 'minor-seventh'), new Chord('D', 'dominant')],

		//

		new Chord('A', 'minor-seventh', [], 3),
		new Chord('D', 'dominant'),
		new Chord('G', 'major', [], 3),
		new Chord('D', 'minor-seventh'),

		new Chord('C'),
		new Chord('A', 'minor-seventh', [], 3),
		new Chord('D', 'dominant'),
		new Chord('G')
	]
};

export const outOfNowhere: Song = {
	title: 'Out of Nowhere',
	key: new Key(3),
	chords: [
		new Chord('A', 'major-seventh', [], 3),
		new Chord('A', 'major-seventh', [], 3),
		new Chord('C', 'minor-seventh'),
		new Chord('F', 'dominant'),

		new Chord('A', 'major-seventh', [], 3),
		new Chord('A', 'major-seventh', [], 3),
		new Chord({ step: 'C', accidental: 'sharp' }, 'minor-seventh'),
		new Chord({ step: 'F', accidental: 'sharp' }, 'dominant'),

		new Chord('B', 'minor-seventh', [], 3),
		[
			new Chord({ step: 'C', accidental: 'sharp' }, 'half-diminished', [7]),
			new Chord({ step: 'F', accidental: 'sharp' }, 'dominant')
		],
		new Chord('B', 'minor-seventh', [], 3),
		new Chord('B', 'minor-seventh', [], 3),

		new Chord('F', 'dominant'),
		new Chord('F', 'dominant'),
		new Chord('B', 'minor-seventh', [], 3),
		new Chord('E', 'dominant'),

		//

		new Chord('A', 'major-seventh', [], 3),
		new Chord('A', 'major-seventh', [], 3),
		new Chord('C', 'minor-seventh'),
		new Chord('F', 'major', [7]),

		new Chord('A', 'major-seventh', [], 3),
		new Chord('A', 'major-seventh', [], 3),
		new Chord({ step: 'C', accidental: 'sharp' }, 'minor-seventh'),
		new Chord(
			{ step: 'F', accidental: 'sharp' }, // Root: F#
			'dominant', // Quality: Dominant 7th
			[9], // Extensions: [9]
			undefined, // Default octave
			[{ interval: 9, alter: -1 }] // Alterations: ♭9
		),

		new Chord('B', 'minor-seventh', [], 3),
		new Chord({ step: 'C', accidental: 'sharp' }, 'half-diminished', [7]),
		new Chord('B', 'minor-seventh', [], 3),
		new Chord('G', 'major', [7]),

		new Chord({ step: 'C', accidental: 'sharp' }, 'minor', [7]),
		new Chord('B', 'minor-seventh', [], 3),
		new Chord('A', 'major', [6], 3),
		[new Chord('B', 'minor-seventh', [], 3), new Chord('E', 'major', [7])]
	],
	breakMeasures: 4
};

export const cottonTail: Song = {
	title: 'Cotton Tail',
	key: new Key(0),
	breakMeasures: 4,
	chords: [
		[new Chord('C', 'major-seventh'), new Chord('A', 'minor-seventh')],
		[new Chord('D', 'minor-seventh'), new Chord('G', 'dominant')],
		[new Chord('E', 'minor-seventh'), new Chord('A', 'minor-seventh')],
		[new Chord('D', 'minor-seventh'), new Chord('G', 'dominant')],

		new Chord('C', 'dominant'),
		[
			new Chord('F', 'major', [6]),
			new Chord({ step: 'F', accidental: 'sharp' }, 'diminished', [7])
		],
		[new Chord('C', 'major'), new Chord('A', 'minor-seventh')],
		[new Chord('D', 'minor-seventh'), new Chord('G', 'dominant')],

		//

		[new Chord('C', 'major-seventh'), new Chord('A', 'minor-seventh')],
		[new Chord('D', 'minor-seventh'), new Chord('G', 'dominant')],
		[new Chord('E', 'minor-seventh'), new Chord('A', 'minor-seventh')],
		[new Chord('D', 'minor-seventh'), new Chord('G', 'dominant')],

		new Chord('C', 'dominant'),
		[
			new Chord('F', 'major', [6]),
			new Chord({ step: 'F', accidental: 'sharp' }, 'diminished', [7])
		],
		[new Chord('C', 'major'), new Chord('A', 'minor-seventh')],
		[new Chord('D', 'minor-seventh'), new Chord('G', 'dominant')],

		// Bridge

		new Chord('E', 'dominant'),
		new Chord('E', 'dominant'),

		new Chord('A', 'dominant'),
		new Chord('A', 'dominant'),

		new Chord('D', 'dominant'),
		new Chord('D', 'dominant'),

		new Chord('G', 'dominant'),
		new Chord('G', 'dominant'),

		//

		[new Chord('C', 'major-seventh'), new Chord('A', 'minor-seventh')],
		[new Chord('D', 'minor-seventh'), new Chord('G', 'dominant')],
		[new Chord('E', 'minor-seventh'), new Chord('A', 'minor-seventh')],
		[new Chord('D', 'minor-seventh'), new Chord('G', 'dominant')],

		new Chord('C', 'dominant'),
		[new Chord('F', 'major', [6]), new Chord({ step: 'F', accidental: 'sharp' }, 'diminished')],
		[new Chord('C', 'major'), new Chord('A', 'minor-seventh')],
		[new Chord('D', 'minor-seventh'), new Chord('G', 'dominant')]
	]
};

export const blueTrain: Song = {
	title: 'Blue Train',
	key: new Key(-1),
	breakMeasures: 4,
	chords: [
		new Chord('F', 'dominant'),
		new Chord({ step: 'B', accidental: 'flat' }, 'dominant', undefined, 3),
		new Chord('F', 'dominant'),
		new Chord('F', 'dominant'),

		new Chord({ step: 'B', accidental: 'flat' }, 'dominant', undefined, 3),
		new Chord({ step: 'B', accidental: 'flat' }, 'dominant', undefined, 3),
		new Chord('F', 'dominant'),
		new Chord('D', 'dominant', undefined, undefined, [{ interval: 9, alter: -1 }]),

		new Chord('G', 'minor-seventh'),
		new Chord('C', 'dominant'),
		[new Chord('F', 'dominant'), new Chord('D', 'dominant')],
		[new Chord('G', 'minor-seventh'), new Chord('C', 'dominant')]
	]
};

export const allSongs: Song[] = [
	blueTrain,
	halfNelson,
	cantalopueIsland,
	boplicity,
	outOfNowhere,
	cottonTail
];
