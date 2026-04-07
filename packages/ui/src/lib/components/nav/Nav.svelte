<script>
	import NavLink from './NavLink.svelte';
</script>

<nav
	class="w-full h-14 px-6 max-sm:px-3 flex flex-row content-between items-center sticky top-0 z-50 nav-bar"
>
	<div class="flex flex-1">
		<NavLink
			href="/"
			text="shane's computer"
			className="font-medium tracking-tight text-theme-text-heading"
		/>
	</div>
	<div class="flex flex-1 justify-end gap-6">
		<NavLink
			href="/about"
			text="about"
			className="content-end text-theme-text-secondary hover:text-theme-text-heading transition-colors"
		/>
	</div>
</nav>

<style>
	.nav-bar {
		background: var(--nav-bg);
		backdrop-filter: blur(var(--nav-blur));
		-webkit-backdrop-filter: blur(var(--nav-blur));
		border-bottom: 1px solid var(--nav-border);
	}
</style>
