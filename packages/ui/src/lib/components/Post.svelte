<script lang="ts">
    import {type Post, PostType} from "@sc/model";
    import ContentRendererStage from "$lib/components/ContentRendererStage.svelte";
    import ContentRendererThree from "$lib/components/ContentRendererThree.svelte";

    export let post: Post | undefined;
    $: title = post?.summary?.title;

    let container: HTMLDivElement | undefined = undefined;
    let cnv: HTMLCanvasElement | undefined = undefined;

</script>

<div>
    <h1>{title}</h1>

    <div bind:this={container} class="container">
        <canvas bind:this={cnv}>your browser does not support HTML canvas :(</canvas>
    </div>

    {#if post}
        {#if post.summary.type === PostType.experiment}
            <ContentRendererStage post={post} container={container} cnv={cnv}/>
        {:else}
            <ContentRendererThree post={post} cnv={cnv}/>
        {/if}
    {/if}

</div>

<style>
    .container {
        width: 100vw;
        height: 100vh;
    }
</style>
