import { writable } from 'svelte/store';

export const compactNav = writable(false);
export const fullbleed = writable(false);
export const navTitle = writable<string | null>(null);
export const paramsOpen = writable(false);
