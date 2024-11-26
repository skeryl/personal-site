function createPlaylistsStore() {
	async function loadPlaylistInfo(id: string) {}

	return {
		loadPlaylistInfo
	};
}

export const playlists = createPlaylistsStore();
