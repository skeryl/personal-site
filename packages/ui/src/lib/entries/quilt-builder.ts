import { type Post, PostType } from '@sc/model';
import QuiltBuilder from '$lib/explorations/quilt-builder.svelte';

const post: Post = {
	summary: {
		id: 'quilt-builder',
		tags: ['quilting', 'design', 'color', 'sandbox'],
		title: 'Quilt Builder',
		subtitle: 'Design a quilt block by block, then get the cutting list for every fabric',
		timestamp: new Date(2026, 7, 9),
		type: PostType.exploration,
		isHidden: false
	},
	content: () => QuiltBuilder
};

export default post;
