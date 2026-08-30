/*
 * Guided tour of the demo, driven by driver.js over the stable data-*
 * hooks. Narrated walkthrough only: every step is skippable and the tour
 * never blocks interaction, so a reader can bail out and start playing.
 */

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { CalcStore } from './state.svelte';

const rootNode = (): Element =>
	document.querySelector('[data-node-path="root"]') ??
	document.querySelector('[data-slot-path="root"]') ??
	document.body;

export const startTour = (store: CalcStore) => {
	const tour = driver({
		showProgress: true,
		overlayOpacity: 0.55,
		popoverClass: 'calc-tour',
		steps: [
			{
				element: '.dsl-input',
				popover: {
					title: 'Two views, one structure',
					description:
						'Type a calculation as text here. The expression and the tree below it are the same underlying structure; edit either one.'
				}
			},
			{
				element: '.palette',
				popover: {
					title: 'The palette',
					description:
						'Operations, fields, and stored calculations. Click to fill the selected slot, or drag anything straight into the tree; dropping an operation onto a node wraps it.'
				}
			},
			{
				element: rootNode,
				popover: {
					title: 'The tree',
					description:
						'The calculation itself. Every slot is typed, clicking a slot offers what fits, and pieces drag to rearrange. Mistakes are fine: problems surface as issues, not blockers.'
				}
			},
			{
				element: '[data-tab="library"]',
				popover: {
					title: 'The library',
					description:
						'Stored calculations for each data model. Click one to load it. Calculations can reference other calculations; the ƒ entries compose.'
				},
				onHighlightStarted: () => {
					store.sideTab = 'library';
				}
			},
			{
				element: '[data-save-calc]',
				popover: {
					title: 'Versioned saves',
					description:
						'Saving appends a new draft version; nothing is ever edited in place, and drafts stay private until published.'
				}
			},
			{
				element: '[data-tab="history"]',
				popover: {
					title: 'The audit trail',
					description:
						'Publish drafts from History. Superseded versions archive themselves, and every hop records who did what, when.'
				},
				onHighlightStarted: () => {
					store.sideTab = 'history';
				}
			},
			{
				element: '[data-tab="debug"]',
				popover: {
					title: 'The debugger',
					description:
						'Pick a record and step the evaluation node by node; step into a ƒ reference to walk its own trace. Self-service answers to "where does this number come from?"'
				},
				onHighlightStarted: () => {
					store.sideTab = 'debug';
				}
			},
			{
				popover: {
					title: 'Now build something',
					description:
						'Load "Consensus grade" from the Library and debug it against a record, or wrap it in a comparison. Reset all (bottom of the Library tab) restores the seed data whenever things get messy.'
				}
			}
		]
	});
	tour.drive();
};
