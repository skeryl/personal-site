<script lang="ts">
	import { type ContentParam, type ContentParams, ParamType } from '$lib/content-params/index.js';
	import ParamInput from '$lib/components/content-params/ParamInput.svelte';

	export let params: ContentParams;
	export let onParamsChange: (p: ContentParams) => void;

	function onParamChange(changedParam: ContentParam<ParamType>) {
		console.log('params change fired!', changedParam);
		if (params && onParamsChange) {
			const newParams = params.map((p) => (p.id === changedParam.id ? changedParam : p));
			onParamsChange(newParams);
			params = newParams;
		}
	}
</script>

<div
	class="fixed right-12 max-sm:right-6 top-[20vh] min-h-[40vh] max-h-[75vh] w-[17vw] bg-surface rounded-md shadow-lg p-4 overflow-y-scroll"
>
	{#each params as param}
		<div class="flex my-2.5">
			<ParamInput {param} onChange={onParamChange} />
		</div>
	{/each}
</div>
