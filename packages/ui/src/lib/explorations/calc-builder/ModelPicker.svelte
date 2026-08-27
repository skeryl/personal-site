<script lang="ts">
	import { MODELS } from './datamodels';
	import type { CalcStore } from './state.svelte';

	let { store }: { store: CalcStore } = $props();
</script>

<div class="picker">
	<div class="picker-buttons">
		{#each MODELS as model (model.id)}
			<button
				class="tool-btn"
				class:active={store.modelId === model.id}
				aria-pressed={store.modelId === model.id}
				data-model-id={model.id}
				onclick={() => store.setModel(model.id)}
			>
				{model.label}
			</button>
		{/each}
	</div>
	<p class="hint">{store.model.description}</p>
</div>

<style>
	.picker-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.4rem;
	}
</style>
