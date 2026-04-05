import { type Post, PostType } from '@sc/model';
import NycSubway from '$lib/explorations/nyc-subway.svelte';

const post: Post = {
	summary: {
		id: 'nyc-subway',
		tags: ['transit', 'nyc', 'data', 'urban-planning', 'maps'],
		title: 'The Subway Gap',
		subtitle: 'Who does the NYC subway leave behind?',
		timestamp: new Date(2026, 3, 5),
		type: PostType.exploration,
		isHidden: false
	},
	content: () => NycSubway
};

export default post;
