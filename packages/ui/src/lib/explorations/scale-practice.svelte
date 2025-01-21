<script lang="ts">
	import {OpenSheetMusicDisplay} from 'opensheetmusicdisplay';
	import {onMount} from 'svelte';
	import {generateMeasures, type Song} from '@sc/synth-builder/musicxml';
	import {allSongs} from "$lib/explorations/scale-practice/songs";

	let container: HTMLDivElement;

	let selectedSong: Song = allSongs[0];
	let musicXML: string = '';
	let osmd: OpenSheetMusicDisplay;

	onMount(async () => {
		if (!container) {
			return;
		}
		osmd = new OpenSheetMusicDisplay(container, {
			measureNumberInterval: 4,
			autoResize: true,
			drawMeasureNumbers: true,
			drawTitle: true,
			drawSlurs: true,
			newSystemFromXML: true
		});
	});

	$: {
		if (osmd && selectedSong) {
			const chordMeasures = generateMeasures(selectedSong);

			musicXML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!DOCTYPE score-partwise PUBLIC
        "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
        "http://www.musicxml.org/dtds/partwise.dtd">
        <score-partwise version="4.0">
        <work>
          <work-title>${selectedSong.title}</work-title>
        </work>
        <part-list>
        <score-part id="P1">
          <part-name>Music</part-name>
        </score-part>
        </part-list>
        <part id="P1">
        ${chordMeasures}
        </part>
        </score-partwise>
        `;

			osmd.load(musicXML).then(() => {
				osmd.render();
			});
		}
	}
</script>

<div class="flex w-full flex-col">
	<div class="w-full flex justify-between">
		<select bind:value={selectedSong} class="justify-self-start">
			{#each allSongs as song}
				<option value={song}>{song.title}</option>
			{/each}
		</select>
		<a
				class="justify-self-end"
			href={`data:text/plain;charset=utf-8,${window.encodeURIComponent(musicXML)}`}
			download={`${selectedSong.title}.xml`}>⬇ Download MusicXML</a
		>
	</div>
	<div bind:this={container} class="w-full"></div>
</div>
