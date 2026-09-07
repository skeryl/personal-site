<script lang="ts">
	import { onMount } from 'svelte';
	import Article from './calc-builder/Article.svelte';
	import SlideDeck from './calc-builder/SlideDeck.svelte';

	let presenting = $state(false);
	let initialSlide = $state(0);

	onMount(() => {
		// #slides or #slides-N (1-based) survives reloads mid-presentation.
		const match = location.hash.match(/^#slides(?:-(\d+))?$/);
		if (match) {
			initialSlide = match[1] ? Number(match[1]) - 1 : 0;
			presenting = true;
		}
	});

	const exitSlides = () => {
		presenting = false;
		history.replaceState(null, '', location.pathname);
	};
</script>

{#if presenting}
	<SlideDeck initial={initialSlide} onexit={exitSlides} />
{:else}
	<Article />
{/if}
