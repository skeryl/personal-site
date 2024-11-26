<script>
	import { loginWithSpotifyClick } from '@sc/spotify';
</script>

<div class="flex flex-col w-full self-center">
	<div class="flex flex-col w-1/2 self-center -mt-20">
		<h3 class="flex flex-row">Welcome to Shane's Playlist Helper</h3>
		<ul class="list-disc pl-4 py-4">
			<li class="ml-2">
				This is a tool designed to help you curate a longer playlist that has distinct "moods".
			</li>
			<li class="ml-2">Each "mood" will be represented by it's own sub-playlist.</li>
			<li class="ml-2">
				Edit each "mood" and compose a main playlist that includes all the moods.
			</li>
			<li class="ml-2">
				To use it, you must log in via Spotify to access your collection of playlists.
			</li>
		</ul>
		<div>
			<button
				id="login-button"
				on:click={loginWithSpotifyClick}
				class="rounded border-2 border-green-400 p-2 px-4 hover:bg-emerald-50"
				> <img
					class="inline pr-0.5"
					width="20px"
					src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png"
					alt="spotify logo"
			/>
				Log in with Spotify
			</button>
		</div>
	</div>
</div>
