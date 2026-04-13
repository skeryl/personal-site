<script>
	import NavLink from './NavLink.svelte';
	import { compactNav, fullbleed } from '$lib/state/layout';
</script>

<nav
	class="w-full px-6 max-sm:px-3 flex flex-row content-between items-center top-0 z-50 nav-bar"
	class:nav-sticky={!$fullbleed}
	class:nav-fixed={$fullbleed}
	class:nav-compact={$compactNav}
>
	<div class="flex flex-1">
		<NavLink
			href="/"
			text="eva's computer"
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
		height: 3.5rem;
		background: var(--nav-bg);
		backdrop-filter: blur(var(--nav-blur));
		-webkit-backdrop-filter: blur(var(--nav-blur));
		border-bottom: 1px solid var(--nav-border);
	}

	.nav-sticky {
		position: sticky;
	}

	.nav-fixed {
		position: fixed;
		width: 100%;
	}

	@media (max-width: 639px) {
		.nav-bar {
			transition:
				height 0.3s ease,
				border-color 0.3s ease,
				opacity 0.3s ease;
			overflow: hidden;
		}

		.nav-bar.nav-compact {
			height: 0;
			border-bottom-color: transparent;
			opacity: 0;
		}
	}
</style>
