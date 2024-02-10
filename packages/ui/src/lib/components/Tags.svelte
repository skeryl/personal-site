<script lang="ts">
	export let tags: string[] = [];
</script>

<div class="tag-container">
	{#each tags as tag}
		<span class="tag">{tag}</span>
	{/each}
</div>

<style>
    .tag-container {
        display: flex;
        flex-direction: row;
        flex-basis: 100%;

    }

    .tag {
        font-style: italic;
        padding: 2px 5px;
        margin: 2px;
        border: solid thin saddlebrown;
        border-radius: 22px;
        font-size: 11px;
    }
</style>