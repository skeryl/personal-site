<script lang="ts">
	import type { ChangeEventHandler, HTMLInputAttributes } from 'svelte/elements';

	interface Props {
		label?: string;
		wrapperClass?: string;
		onChange: ChangeEventHandler<HTMLInputElement>;
		[key: string]: any;
	}

	let { label = '', wrapperClass = '', onChange, ...rest }: Props = $props();
</script>

<div class={`flex flex-col ${wrapperClass}`}>
	<label for={rest.name} class="w-full">
		{#if label}
			<span class="text-xs font-bold">{label}</span>
		{/if}
	</label>
	<input {...rest} class={`rounded !text-md px-2 py-1 ${rest.class}`} onchange={onChange} />
</div>
