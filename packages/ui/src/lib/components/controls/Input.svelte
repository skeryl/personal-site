<script lang="ts">
	import type {ChangeEventHandler, HTMLInputAttributes} from 'svelte/elements';

	export let label: string = '';
	export let wrapperClass: string = '';
	export let onChange: ChangeEventHandler<HTMLInputElement>;

	interface $$Props extends HTMLInputAttributes {
		label?: string;
		wrapperClass?: string;
		onChange: ChangeEventHandler<HTMLInputElement>;
	}
</script>

<div class={`flex flex-col ${wrapperClass}`}>
	<label for={$$restProps.name} class="w-full">
		{#if label}
			<span class="text-xs font-bold">{label}</span>
		{/if}
	</label>
	<input {...$$restProps} class={`rounded !text-md px-2 py-1 ${$$restProps.class}`} on:change={onChange}/>
</div>
