import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import postSummarizerPlugin from './plugins/post-summarizer';

const postSummarizer = await postSummarizerPlugin({
	entriesDir: './src/lib/entries/',
	pagesDir: './src/routes/journal/',
	videosDir: './src/lib/assets/videos/posts/'
});

export default defineConfig({
	plugins: [postSummarizer, sveltekit()],
	ssr: {
		// Skeleton ships raw .svelte files but is declared in the root
		// package.json, where vite-plugin-svelte doesn't look for Svelte libs.
		noExternal: ['@skeletonlabs/skeleton']
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'plugins/**/*.{test,spec}.{js,ts}']
	}
});
