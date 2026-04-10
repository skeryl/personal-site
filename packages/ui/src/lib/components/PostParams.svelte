<script lang="ts">
	import { type ContentParam, type ContentParams, ParamType } from '$lib/content-params/index.js';
	import ParamInput from '$lib/components/content-params/ParamInput.svelte';

	interface Props {
		params: ContentParams;
		onParamsChange: (p: ContentParams) => void;
	}

	let { params = $bindable(), onParamsChange }: Props = $props();

	function onParamChange(changedParam: ContentParam<ParamType>) {
		if (params && onParamsChange) {
			const newParams = params.map((p) => (p.id === changedParam.id ? changedParam : p));
			onParamsChange(newParams);
			params = newParams;
		}
	}
</script>

<div
	class="absolute bottom-[calc(100%+0.5rem)] right-2 w-fit min-w-[200px] max-w-[calc(100vw-1rem)] max-h-[60vh] rounded-md shadow-lg p-4 overflow-y-auto z-10 sm:min-w-[200px] max-sm:left-2 max-sm:min-w-0 max-sm:w-auto max-sm:p-5 params-panel"
>
	{#each params as param}
		<div class="flex w-full my-2.5 max-sm:my-4">
			<ParamInput {param} onChange={onParamChange} />
		</div>
	{/each}
</div>

<style>
	.params-panel {
		background: color-mix(in srgb, var(--color-surface) 82%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
</style>
