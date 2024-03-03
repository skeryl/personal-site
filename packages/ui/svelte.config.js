// import adapter from '@sveltejs/adapter-auto';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			precompress: true,
			strict: true,
			fallback: 'index.html'
		})
	}
};

export default config;
