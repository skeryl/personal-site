<script lang="ts">
	import type { Vec2 } from '$lib/content-params';
	import Input from '$lib/components/controls/Input.svelte';
	import type {ChangeEventHandler} from "svelte/elements";

	export let value: Vec2;
	export let label: string;
	export let onChange: (val: Vec2) => void;

	$: x = value[0];
	$: y = value[1];

	const triggerChangeX: ChangeEventHandler<HTMLInputElement> = (e) => {
		const value = Number((e.target as HTMLInputElement).value);
		onChange([value, y]);
	}
	const triggerChangeY: ChangeEventHandler<HTMLInputElement> = (e) => {
		const value = Number((e.target as HTMLInputElement).value);
		onChange([x, value]);
	}
</script>

<div class="flex flex-col w-full">
	<span class="text-xs font-bold mb-1">{label}</span>
	<div class="flex flex-row w-full">
		<Input
			value={x}
			onChange={triggerChangeX}
			type="number"
			placeholder="x"
			wrapperClass="flex flex-shrink w-[50%]"
			class="w-full rounded-r-none"
		/>
		<Input
			value={y}
			onChange={triggerChangeY}
			type="number"
			placeholder="y"
			wrapperClass="flex flex-shrink w-[50%]"
			class="w-full rounded-l-none"
		/>
	</div>
</div>
