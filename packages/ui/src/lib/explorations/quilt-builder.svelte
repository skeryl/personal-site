<script lang="ts">
	import { onMount } from 'svelte';
	/*
	 * The styles can come in with the page: they are a stylesheet, and the
	 * bundler takes them without ever running the module.
	 */
	import '@skeryl/quilt-client/style.css';

	/*
	 * The builder itself cannot. It lives in skeryl/quilt-builder now and
	 * arrives as a custom element that defines itself when its module is
	 * imported — and `customElements` is a browser's, not a prerender's. This
	 * page is prerendered, so the import waits for the client.
	 */
	let ready = $state(false);
	onMount(async () => {
		await import('@skeryl/quilt-client');
		ready = true;
	});
</script>

{#if ready}
	<quilt-builder></quilt-builder>
{:else}
	<!-- Holds the builder's own ground and height, so the page does not jump
	     when the element arrives. -->
	<div class="waiting" aria-hidden="true"></div>
{/if}

<style>
	/*
	 * The page lays itself out with padding (px-6, px-3 narrow, pb-8), and the
	 * wall is meant to reach the window. The builder fits whatever box it is
	 * given and takes this back only because we hand it over; the breakpoints
	 * are this site's, which is why they are written here and not in there.
	 */
	:global(quilt-builder) {
		/*
		 * The element is a flex item here, and a block-level one sizes to its
		 * contents rather than to the row. Left alone it came out 1061px wide
		 * inside a 1232px column, and every width inside it was then measured
		 * against the wrong box. Before the builder was a package, .qb was the
		 * flex item itself and took the row without being asked.
		 */
		flex: 1;
		min-width: 0;
		--qb-bleed-x: 1.5rem;
		--qb-bleed-bottom: 2rem;
	}
	.waiting {
		width: calc(100% + 3rem);
		margin-inline: -1.5rem;
		margin-bottom: -2rem;
		height: 60vh;
		background: #f5f4f2;
	}

	@media (max-width: 639px) {
		:global(quilt-builder) {
			--qb-bleed-x: 0.75rem;
		}
		.waiting {
			width: calc(100% + 1.5rem);
			margin-inline: -0.75rem;
		}
	}

	@media (max-width: 768px) {
		:global(quilt-builder) {
			--qb-bleed-bottom: 0;
		}
		.waiting {
			margin-bottom: 0;
		}
	}
</style>
