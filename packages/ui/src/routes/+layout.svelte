<script>
	import 'iconify-icon';
	import '../app.css';
	import Nav from '$lib/components/nav/Nav.svelte';
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';

	import { storePopup } from '@skeletonlabs/skeleton';
	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
</script>

<Nav />

<div class="py-1 px-6 max-sm:px-3">
	<slot />
</div>
