<script lang="ts">
	import { onMount } from 'svelte';
	import { ClientInitState } from '@sc/spotify';
	import LoginScreen from '$lib/explorations/playlist-helper/LoginScreen.svelte';
	import PlaylistHelperMain from '$lib/explorations/playlist-helper/PlaylistHelperMain.svelte';
	import { playlistHelper } from '$lib/explorations/playlist-helper/stores';

	let initializationState: ClientInitState | undefined;

	onMount(async () => {
		await playlistHelper.init();

        playlistHelper.subscribeToClientState(state => {
            initializationState = state;
        })
	});
</script>

{#if initializationState !== ClientInitState.AUTHENTICATED}
	<LoginScreen />
	{:else}
	<div class="flex flex-col w-full">
		<PlaylistHelperMain />
	</div>
{/if}
