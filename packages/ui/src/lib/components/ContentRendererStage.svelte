<script lang="ts">
    import {type Post, type PostContent, type StageContent} from "@sc/model";
    import {Stage} from "grraf";

    export let post: Post<PostContent> | undefined = undefined;
    export let container: HTMLDivElement | undefined = undefined;
    export let cnv: HTMLCanvasElement | undefined = undefined;

    $: if(cnv) {
        const stage: Stage | undefined = new Stage(cnv!);

        stage.canvas.height = container!.clientHeight;
        stage.canvas.width = container!.clientWidth;
        const content = post!.content() as StageContent;
        content.start(stage);
    }
</script>
