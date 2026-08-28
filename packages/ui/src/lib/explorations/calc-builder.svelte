<script lang="ts">
	import { onMount } from 'svelte';
	import Article from './calc-builder/Article.svelte';
	import SlideDeck from './calc-builder/SlideDeck.svelte';

	let presenting = $state(false);

	onMount(() => {
		if (location.hash === '#slides') presenting = true;
	});

	const enterSlides = () => {
		presenting = true;
		history.replaceState(null, '', '#slides');
	};
	const exitSlides = () => {
		presenting = false;
		history.replaceState(null, '', location.pathname);
	};
</script>

{#if presenting}
	<SlideDeck onexit={exitSlides} />
{:else}
	<Article onpresent={enterSlides} />
{/if}
