<script lang="ts">
	export let tags: string[] = [];
	export let activeTags: Set<string> = new Set();
	export let onTagClick: ((tag: string) => void) | undefined = undefined;
</script>

<div class="flex gap-1.5 flex-wrap">
	{#each tags as tag}
		{#if onTagClick}
			<button
				class="rounded-full py-0.5 px-2.5 text-xs text-nowrap h-fit transition-colors border"
				class:bg-neutral-700={activeTags.has(tag)}
				class:text-white={activeTags.has(tag)}
				class:border-neutral-700={activeTags.has(tag)}
				class:bg-neutral-100={!activeTags.has(tag)}
				class:text-neutral-500={!activeTags.has(tag)}
				class:border-neutral-200={!activeTags.has(tag)}
				class:hover:border-neutral-400={!activeTags.has(tag)}
				class:hover:text-neutral-700={!activeTags.has(tag)}
				on:click|preventDefault|stopPropagation={() => onTagClick?.(tag)}
			>
				{tag}
			</button>
		{:else}
			<span
				class="rounded-full py-0.5 px-2.5 text-xs text-nowrap h-fit border"
				class:bg-neutral-700={activeTags.has(tag)}
				class:text-white={activeTags.has(tag)}
				class:border-neutral-700={activeTags.has(tag)}
				class:bg-neutral-100={!activeTags.has(tag)}
				class:text-neutral-500={!activeTags.has(tag)}
				class:border-neutral-200={!activeTags.has(tag)}
			>
				{tag}
			</span>
		{/if}
	{/each}
</div>
