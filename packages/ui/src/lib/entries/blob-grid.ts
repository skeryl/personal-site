import { type Post, PostType } from '@sc/model';
import BlobGrid from '$lib/explorations/blob-grid.svelte';

const post: Post = {
	summary: {
		id: 'blob-grid',
		tags: ['animation', 'canvas'],
		title: 'Blob Grid',
		timestamp: new Date(2026, 3, 4),
		type: PostType.exploration,
		isHidden: false,
		collaborators: [{ name: 'Eva Warren', role: 'Art Direction', url: 'https://evamarie.studio' }]
	},
	content: () => BlobGrid
};

export default post;
