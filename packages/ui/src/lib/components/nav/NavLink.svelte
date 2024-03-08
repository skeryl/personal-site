<script lang="ts">
    import { page } from '$app/stores';

    export let href: string;
    export let text: string;

    export let className: string = '';

    $: isActiveRoute = $page.url.pathname === href;
</script>

<a href={href} class={`${isActiveRoute ? 'underline underline-offset-4' : 'no-underline'} ${className}`}>{text}</a>