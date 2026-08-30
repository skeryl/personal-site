<script lang="ts">
	import { MODELS } from './datamodels';
	import { startTour } from './tour';
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
		<button
			class="tool-btn tour-btn"
			data-start-tour
			onclick={() => startTour(store)}
			title="A short guided tour of the tool"
		>
			✦ Tour
		</button>
	</div>
	<p class="hint">{store.model.description}</p>
</div>

<style>
	.tour-btn {
		margin-left: auto;
		color: var(--cb-accent);
		border-color: var(--cb-accent);
	}

	.picker-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.4rem;
	}
</style>
