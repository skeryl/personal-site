<script lang="ts">
	export let tags: string[] = [];
</script>

<div class="flex gap-1">
	{#each tags as tag}
		<span class="rounded-full py-1 px-3 border-2 text-xs text-nowrap h-fit">{tag}</span>
	{/each}
</div>