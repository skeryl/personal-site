<script lang="ts">
	import 'iconify-icon';
	import '../app.css';
	import Nav from '$lib/components/nav/Nav.svelte';
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';

	import { storePopup } from '@skeletonlabs/skeleton';
	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
</script>

<Nav />

<div
	class="pt-3 pb-8 px-6 max-sm:px-3 max-sm:pt-1 max-sm:pb-2 max-sm:flex max-sm:flex-col layout-content"
>
	<slot />
</div>

<style>
	@media (max-width: 639px) {
		.layout-content {
			min-height: calc(100dvh - 3.5rem);
		}
	}
</style>
