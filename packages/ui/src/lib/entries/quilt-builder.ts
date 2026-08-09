import { type Post, PostType } from '@sc/model';
import QuiltBuilder from '$lib/explorations/quilt-builder.svelte';

const post: Post = {
	summary: {
		id: 'quilt-builder',
		tags: ['quilting', 'design', 'color', 'sandbox'],
		title: 'Quilt Builder',
		subtitle: 'Laying out a scrap blanket when you only have so many squares of each color',
		timestamp: new Date(2026, 7, 9),
		type: PostType.exploration,
		isHidden: false
	},
	content: () => QuiltBuilder
};

export default post;
