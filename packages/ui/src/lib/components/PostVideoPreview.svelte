<script lang="ts">
    import videos from "$lib/assets/videos/posts/index.js";
    import {onMount} from "svelte";
    import type {PostSummary} from "@sc/model";

    const videoSources = Object.entries(videos);
    export let selectedPost: PostSummary | undefined;
    let currentPost: string | undefined;

    let vid: HTMLVideoElement;

    $: {
        if(selectedPost && currentPost !== selectedPost.id) {
            console.log("changing video source...");
            const sources = Array.from(vid.querySelectorAll("source"));
            sources.forEach(src => src.remove());
            vid.load();

            const source = document.createElement("source");
            source.setAttribute("src", `${videos[selectedPost.id]}#t=[3]`);
            source.setAttribute("type", "video/webm");
            vid.appendChild(source);
            vid.load();
            vid.play();
        }
    }

    onMount(() => {
       vid.load();
    });
</script>

<video bind:this={vid} autoplay loop muted id="post-preview-video" class="absolute top-0 bottom-0 left-0 right-0 -z-50 opacity-45 block object-cover max-h-[80vw] h-full w-full">
    <!--{#each videoSources as [postId, videoSrc]}
        <source src={videoSrc} id={`post-video-src:${postId}`} type="video/webm">
    {/each}-->
</video>