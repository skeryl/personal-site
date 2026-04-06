<script lang="ts">
	import { type ExplorationContent, type Post } from '@sc/model';
	interface Props {
		post?: Post | undefined;
	}

	let { post = undefined }: Props = $props();

	const Component = post?.content() as ExplorationContent | undefined;
</script>

{#if Component}
	<Component />
{/if}
