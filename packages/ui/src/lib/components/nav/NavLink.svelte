<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		href: string;
		text: string;
		className?: string;
	}

	let { href, text, className = '' }: Props = $props();

	let isActiveRoute = $derived($page.url.pathname === href);
</script>

<a {href} class={`${isActiveRoute ? 'underline underline-offset-4' : 'no-underline'} ${className}`}
	>{text}</a
>
