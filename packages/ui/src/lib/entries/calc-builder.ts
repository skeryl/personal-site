import { type Post, PostType } from '@sc/model';
import CalcBuilder from '$lib/explorations/calc-builder.svelte';

const post: Post = {
	summary: {
		id: 'calc-builder',
		tags: ['finance', 'ast', 'no-code', 'sandbox'],
		title: 'Calc Builder',
		subtitle:
			'The story of a calculation platform born from an angry phone call, rebuilt from memory with a live demo',
		timestamp: new Date(2026, 7, 27),
		type: PostType.exploration,
		isHidden: false
	},
	content: () => CalcBuilder
};

export default post;
