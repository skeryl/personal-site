<script lang="ts">
	import { type ExplorationContent, type Post } from '@sc/model';
	export let post: Post | undefined = undefined;

	const Component = post?.content() as ExplorationContent | undefined;
</script>

{#if Component}
	<Component />
{/if}
