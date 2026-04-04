import { type Post, PostType } from '@sc/model';
import BlobGrid from '$lib/explorations/blob-grid.svelte';

const post: Post = {
	summary: {
		id: 'blob-grid',
		tags: ['animation', 'canvas'],
		title: 'Blob Grid',
		timestamp: new Date(2024, 11, 4),
		type: PostType.exploration,
		isHidden: false
	},
	content: () => BlobGrid
};

export default post;
