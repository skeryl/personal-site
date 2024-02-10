import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import postSummarizerPlugin from './plugins/post-summarizer';

const postSummarizer = await postSummarizerPlugin({
	entriesDir: './src/lib/entries/',
	pagesDir: './src/routes/journal/'
});

export default defineConfig({
	plugins: [postSummarizer, sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'plugins/**/*.{test,spec}.{js,ts}']
	}
});
