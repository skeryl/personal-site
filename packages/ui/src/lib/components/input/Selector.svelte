<script lang="ts">
    import { popup } from '@skeletonlabs/skeleton';
	import {
		Autocomplete,
		type AutocompleteOption,
		type PopupSettings
	} from '@skeletonlabs/skeleton';

	interface $$Props<T = any, Meta = unknown> {
		items: AutocompleteOption<T, Meta>;
		searchValue: string | undefined;
		popupSettings: PopupSettings | undefined;
	}

	export let items: AutocompleteOption<T, Meta>[];
	export let searchValue: string | undefined;
	export let popupSettings: PopupSettings = {
		event: 'focus-click',
		target: 'popupAutocomplete',
		placement: 'bottom'
	};

	function onValueChanged(e: Event) {
		console.log(e);
	}

/*	$: filtered = searchValue
		? items?.filter((item) =>
				item.label
					.toLowerCase()
					.replace(/\s+/g, '')
					.includes(searchValue!.toLowerCase().replace(/\s+/g, ''))
			)
		: items;*/
</script>

<input
	class="input autocomplete"
	type="search"
	name="autocomplete-search"
	bind:value={searchValue}
	placeholder="Search..."
	use:popup={popupSettings}
/>
<div data-popup="popupAutocomplete">
	<Autocomplete bind:input={searchValue} options={items} on:selection={onValueChanged} />
</div>

<!--
<div class="flex w-full flex-col items-center justify-center">
    <div class="fixed top-16 w-72">
        <div class="relative mt-1">
            <div
                    class="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left text-sm shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300"
            >
                <input
                        use:combobox.input
                        on:change={onValueChanged}
                        class="w-full border-none py-2 pl-3 pr-10 leading-5 text-gray-900 focus:ring-0"
                />
                &lt;!&ndash;value={$combobox.selected?.text ?? null}&ndash;&gt;
                &lt;!&ndash; <span class="block truncate">{people[$listbox.selected].name}</span> &ndash;&gt;
                <button
                        use:combobox.button
                        class="absolute inset-y-0 right-0 flex items-center pr-2"
                        type="button"
                >
                    &lt;!&ndash;<Selector class="h-5 w-5 text-gray-400" />&ndash;&gt; <div class="h-5 w-5 text-gray-400">Selector</div>
                </button>
            </div>

            <Transition
                    show={$combobox.expanded}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    on:after-leave={() => combobox.reset()}
            >
                <ul
                        use:combobox.items
                        class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                    {#each filtered as value}
                        {@const active = $combobox.active === value}
                        {@const selected = $combobox.selected === value}
                        <li
                                class="relative cursor-default select-none py-2 pl-10 pr-4 {active
                ? 'bg-teal-600 text-white'
                : 'text-gray-900'}"
                                use:combobox.item={{ value }}
                        >
              <span class="block truncate {selected ? 'font-medium' : 'font-normal'}"
              >{value.text}</span
              >
                            {#if selected}
                <span
                        class="absolute inset-y-0 left-0 flex items-center pl-3 {active
                    ? 'text-white'
                    : 'text-teal-600'}"
                >
                  ✓
                </span>
                            {/if}
                        </li>
                    {:else}
                        <li class="relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900">
                            <span class="block truncate font-normal">Nothing found</span>
                        </li>
                    {/each}
                </ul>
            </Transition>
        </div>
    </div>
</div>-->
