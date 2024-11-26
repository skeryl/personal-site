import { writable } from 'svelte/store';
import type { PlaylistMood } from '$lib/explorations/playlist-helper/stores';

const moodLocalStorageKey = 'moods';

function createMoodStore() {
	const moods = writable<PlaylistMood[]>([
		{
			sequence: 0,
			color: '#ffdeb4',
			playlist: /*{
				id: '0PpbvPPMHBmAhmkfHPgNVF',
				name: "NOT (HOS) 1 sunset at forest's edge"
			} */ {
				id: '7m5uudQN9oQa5OmUnLGFG7',
				name: "(HOS) 1 sunset at forest's edge"
			}
		},
		{
			sequence: 1,
			color: '#ff9346',
			playlist: {
				id: '5eOJmWO46b5hkzXaNhC3AL',
				name: '(HOS) 2 twilight in the forest'
			}
		},
		{
			sequence: 2,
			color: '#ffb1f9',
			playlist: {
				id: '5c7Hd7YIYIR3z4akeDJRtu',
				name: '(HOS) 3 fireside mingling'
			}
		},
		{
			sequence: 3,
			color: '#a1c5ff',
			playlist: {
				id: '6huzHytRwWsjln5jKEPsqG',
				name: '(HOS) 4 moonlit dance'
			}
		},
		{
			sequence: 4,
			color: '#caffad',
			playlist: {
				id: '2rNdEk4FTY0D1jEtIA29t4',
				name: '(HOS) 5 Casting spells by moonlight'
			}
		},
		{
			sequence: 5,
			color: '#cfb1ff',
			playlist: {
				id: '3Nam7Q2gqX55bxDnaJlC7Z',
				name: '(HOS) 6 Unfettered Creatures of Night'
			}
		},
		{
			sequence: 6,
			color: '#ffffc6',
			playlist: {
				id: '1CXIIKWzNWybEistRY6MKk',
				name: '(HOS) 7 relinquishing demons'
			}
		}
	]);

	function createNewMood() {
		console.log('new mood clicked');
		/*moods.update((m) => {
			m.push({ sequence: m.length });
			return m;
		});*/
	}

	function updateMood(mood: PlaylistMood) {
		console.log('updated mood: ', mood);
		moods.update((m) => {
			m[mood.sequence] = mood;
			return m;
		});
	}

	return {
		moods,
		createNewMood,
		updateMood
	};
}

export const moodStore = createMoodStore();
