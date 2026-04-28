<script lang="ts">
	import { compactNav, fullbleed, navTitle, paramsOpen } from '$lib/state/layout';

	const options = [
		{ label: 'Computer', href: '/', external: false },
		{ label: 'Portfolio', href: 'https://evamarie.studio', external: true },
		{ label: 'Shop', href: 'https://shop.evamarie.studio', external: true }
	];

	let selected = $state(options[0]);
	let open = $state(false);

	function select(option: (typeof options)[number]) {
		open = false;
		if (option.external) {
			window.open(option.href, '_blank', 'noopener,noreferrer');
		} else {
			selected = option;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<nav
	class="w-full px-6 max-sm:px-3 flex flex-row content-between items-center max-sm:justify-center top-0 z-50 nav-bar"
	class:nav-sticky={!$fullbleed}
	class:nav-fixed={$fullbleed}
	class:nav-compact={$compactNav}
>
	<div class="site-title-wrap">
		<span class="evas">Eva's&nbsp;</span>
		<div class="dropdown-wrap" class:open>
			<button
				class="dropdown-trigger"
				onclick={() => (open = !open)}
				aria-haspopup="listbox"
				aria-expanded={open}
			>
				<span class="dropdown-label">{selected.label}</span>
				<svg class="chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
					<path
						d="M1 1l4 4 4-4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
			{#if open}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="dropdown-backdrop" onclick={() => (open = false)}></div>
				<ul class="dropdown-menu" role="listbox">
					{#each options as option}
						<li role="option" aria-selected={option === selected}>
							<button class="dropdown-item" onclick={() => select(option)}>
								{option.label}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</nav>

{#if $navTitle}
	<span class="nav-post-title">
		<a href="/" class="nav-home-link">Home</a>
		<span class="nav-title-separator">/</span>
		<span class="nav-entry-title">{$navTitle}</span>
	</span>
{/if}

<style>
	.nav-bar {
		height: 6rem;
		background: transparent;
		mix-blend-mode: multiply;
	}

	.nav-sticky {
		position: sticky;
	}

	.nav-fixed {
		position: fixed;
		width: 100%;
	}

	.nav-post-title {
		position: fixed;
		top: 0;
		right: 1.5rem;
		height: 6rem;
		display: flex;
		align-items: center;
		gap: 0.6em;
		font-family: 'DM Sans', sans-serif;
		font-size: 1.155rem;
		font-weight: 400;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		white-space: nowrap;
		z-index: 50;
		mix-blend-mode: multiply;
	}

	.nav-home-link {
		color: #fd52ca;
		text-decoration: none;
		pointer-events: all;
	}

	.nav-title-separator,
	.nav-entry-title {
		color: #000;
		pointer-events: none;
	}

	.site-title-wrap {
		display: flex;
		align-items: baseline;
		font-family: 'DM Mono', monospace;
		font-size: 1.155rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.evas {
		color: var(--color-text-heading, #000);
		white-space: nowrap;
	}

	.dropdown-wrap {
		position: relative;
	}

	.dropdown-trigger {
		display: flex;
		align-items: center;
		gap: 0.35em;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		font-family: 'DM Mono', monospace;
		font-size: 1.155rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #fd52ca;
		line-height: inherit;
	}

	.dropdown-label {
		line-height: 1;
	}

	.chevron {
		color: #fd52ca;
		flex-shrink: 0;
		margin-bottom: -0.1em;
		transition: transform 0.15s;
	}

	.dropdown-wrap.open .chevron {
		transform: rotate(180deg);
	}

	.dropdown-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		background: white;
		border: 1px solid #e5e5e5;
		list-style: none;
		margin: 0;
		padding: 0.25rem 0;
		z-index: 50;
		min-width: 100%;
		white-space: nowrap;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: 0.4rem 1rem;
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'DM Mono', monospace;
		font-size: 1rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
		text-align: left;
	}

	.dropdown-item:hover {
		color: #fd52ca;
	}

	@media (max-width: 639px) {
		.nav-post-title {
			left: 0;
			right: 0;
			padding: 0 1rem;
			justify-content: center;
			font-size: 0.98rem;
		}

		.nav-bar {
			transition:
				height 0.3s ease,
				border-color 0.3s ease,
				opacity 0.3s ease;
		}

		.nav-bar.nav-compact {
			height: 0;
			border-bottom-color: transparent;
			opacity: 0;
			overflow: hidden;
		}
	}
</style>
