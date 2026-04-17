import { type Post, PostType } from '@sc/model';
import ChessTrainer from '$lib/explorations/chess-trainer.svelte';

const post: Post = {
	summary: {
		id: 'chess-trainer',
		tags: ['chess', 'training', 'openings'],
		title: 'Opening Trainer',
		subtitle: 'Drill a chess opening repertoire, weighted by what opponents actually play',
		timestamp: new Date(2026, 3, 17),
		type: PostType.exploration,
		isHidden: false
	},
	content: () => ChessTrainer
};

export default post;
