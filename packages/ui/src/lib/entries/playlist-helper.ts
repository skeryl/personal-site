import { type Post, PostType } from '@sc/model';
import PlaylistHelper from '$lib/explorations/playlist-helper.svelte';

const post: Post = {
	summary: {
		id: 'playlist-helper',
		tags: ['music', 'spotify', 'playlists'],
		title: 'Playlist Helper',
		timestamp: new Date(2024, 9, 5),
		type: PostType.exploration,
		isHidden: true
	},
	content: () => PlaylistHelper
};

export default post;
