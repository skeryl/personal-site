import { type Post, PostType } from '@sc/model';
import ScalePractice from '$lib/explorations/scale-practice.svelte';

const post: Post = {
	summary: {
		id: 'scale-practice',
		tags: ['music'],
		title: 'Scale Practice',
		timestamp: new Date(2024, 10, 28),
		type: PostType.exploration,
		isHidden: false
	},
	content: () => ScalePractice
};

export default post;
