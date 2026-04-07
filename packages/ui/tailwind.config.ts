import { join } from 'path';

import type { Config } from 'tailwindcss';
import { skeleton } from '@skeletonlabs/tw-plugin';

export default {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {
			colors: {
				theme: {
					bg: 'var(--color-bg)',
					text: 'var(--color-text)',
					'text-heading': 'var(--color-text-heading)',
					'text-muted': 'var(--color-text-muted)',
					'text-secondary': 'var(--color-text-secondary)',
					'text-strong': 'var(--color-text-strong)',
					surface: 'var(--color-surface)',
					'surface-secondary': 'var(--color-surface-secondary)',
					'surface-active': 'var(--color-surface-active)',
					'surface-active-strong': 'var(--color-surface-active-strong)',
					border: 'var(--color-border)',
					'border-strong': 'var(--color-border-strong)',
					'border-subtle': 'var(--color-border-subtle)',
					success: 'var(--color-accent-success)',
					'success-bg': 'var(--color-accent-success-bg)',
					danger: 'var(--color-accent-danger)',
					'filter-bg': 'var(--color-filter-bg)',
					'filter-text': 'var(--color-filter-text)',
					'filter-hover-bg': 'var(--color-filter-hover-bg)',
					'filter-active-bg': 'var(--color-filter-active-bg)',
					'filter-active-text': 'var(--color-filter-active-text)',
					'tag-bg': 'var(--color-tag-bg)',
					'tag-text': 'var(--color-tag-text)',
					'tag-border': 'var(--color-tag-border)',
					'tag-hover-border': 'var(--color-tag-hover-border)',
					'tag-hover-text': 'var(--color-tag-hover-text)',
					'tag-active-bg': 'var(--color-tag-active-bg)',
					'tag-active-text': 'var(--color-tag-active-text)',
					'tag-active-border': 'var(--color-tag-active-border)'
				}
			},
			fontFamily: {
				body: 'var(--font-body)',
				heading: 'var(--font-heading)'
			}
		}
	},
	plugins: [skeleton({ themes: { preset: ['vintage'] } })]
} satisfies Config;
