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
			className="font-medium tracking-tight text-neutral-800"
		/>
	</div>
	<div class="flex flex-1 justify-end gap-6">
		<NavLink
			href="/about"
			text="about"
			className="content-end text-neutral-500 hover:text-neutral-800 transition-colors"
		/>
	</div>
</nav>

<style>
	.nav-bar {
		background: rgba(250, 250, 249, 0.6);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	}
</style>
