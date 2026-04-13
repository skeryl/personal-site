<script lang="ts">
	import 'iconify-icon';
	import '../app.css';
	import Nav from '$lib/components/nav/Nav.svelte';
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { fullbleed } from '$lib/state/layout';

	import { storePopup } from '@skeletonlabs/skeleton';
	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
</script>

<Nav />

<div class="layout-content" class:layout-padded={!$fullbleed}>
	<slot />
</div>

<style>
	.layout-padded {
		padding: 0.75rem 1.5rem 2rem;
	}

	@media (max-width: 639px) {
		.layout-padded {
			padding: 0.25rem 0.75rem 0.5rem;
			min-height: calc(100dvh - 3.5rem);
			display: flex;
			flex-direction: column;
		}
	}
</style>
