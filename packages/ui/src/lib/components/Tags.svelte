<script lang="ts">
	import { preventDefault, stopPropagation } from 'svelte/legacy';

	interface Props {
		tags?: string[];
		activeTags?: Set<string>;
		onTagClick?: ((tag: string) => void) | undefined;
	}

	let { tags = [], activeTags = new Set(), onTagClick = undefined }: Props = $props();
</script>

<div class="flex gap-1.5 flex-wrap">
	{#each tags as tag}
		{#if onTagClick}
			<button
				class="rounded-full py-0.5 px-2.5 text-xs text-nowrap h-fit transition-colors border"
				class:bg-theme-tag-active-bg={activeTags.has(tag)}
				class:text-theme-tag-active-text={activeTags.has(tag)}
				class:border-theme-tag-active-border={activeTags.has(tag)}
				class:bg-theme-tag-bg={!activeTags.has(tag)}
				class:text-theme-tag-text={!activeTags.has(tag)}
				class:border-theme-tag-border={!activeTags.has(tag)}
				class:hover:border-theme-tag-hover-border={!activeTags.has(tag)}
				class:hover:text-theme-tag-hover-text={!activeTags.has(tag)}
				onclick={stopPropagation(preventDefault(() => onTagClick?.(tag)))}
			>
				{tag}
			</button>
		{:else}
			<span
				class="rounded-full py-0.5 px-2.5 text-xs text-nowrap h-fit border"
				class:bg-theme-tag-active-bg={activeTags.has(tag)}
				class:text-theme-tag-active-text={activeTags.has(tag)}
				class:border-theme-tag-active-border={activeTags.has(tag)}
				class:bg-theme-tag-bg={!activeTags.has(tag)}
				class:text-theme-tag-text={!activeTags.has(tag)}
				class:border-theme-tag-border={!activeTags.has(tag)}
			>
				{tag}
			</span>
		{/if}
	{/each}
</div>
