<script lang="ts">
	import { differenceInYears } from 'date-fns/differenceInYears';

	const years: number = differenceInYears(new Date(), new Date('2009-07-01'));
</script>

<svelte:head>
	<title>about · shane's computer</title>
	<!-- TODO: a sentence for search results and link previews -->
	<!-- <meta name="description" content="" /> -->
</svelte:head>

<section class="py-2">
	<h1>what's all this?</h1>
	<p>
		I am Shane. This is my site! It's my space for ideas, art, creative coding, analysis, play, etc.
	</p>
	<p>I'm a professional software engineer with about {years} years of experience.</p>

	<!--
		TODO: the career summary. One paragraph tying the professional work
		together, using Calc Builder as the worked example.
	-->
	<h2>the day job</h2>
	<p>
		<a href="/journal/calc-builder">Calc Builder</a> is the story of a calculation platform born from
		an angry phone call, rebuilt from memory with a live demo.
	</p>

	<!--
		TODO: the paragraph about working with Eva. Art direction on the two blob
		pieces below, design work on this site, and both design and implementation
		on Quilt Builder, which started as a tool for her.
	-->
	<h2>working with Eva</h2>
	<p>
		Art direction by <a href="https://evamarie.studio" target="_blank" rel="noopener noreferrer"
			>Eva Marie</a
		>:
	</p>
	<ul class="list-disc pl-5">
		<li><a href="/journal/blob-grid">Blob Grid</a></li>
		<li><a href="/journal/blob-convergence">Blob Convergence</a></li>
		<li>
			<a href="/journal/quilt-builder">Quilt Builder</a>: design a quilt block by block, then get
			the cutting list for every fabric
		</li>
	</ul>

	<!--
		TODO: the journal summary. What the entries are and why they're here,
		then the handful worth starting with. Swap the picks below for yours.
	-->
	<h2>the journal</h2>
	<p>Everything else lives in <a href="/journal">the journal</a>. A few to start with:</p>
	<ul class="list-disc pl-5">
		<li><a href="/journal/quilt-builder">Quilt Builder</a></li>
		<li><a href="/journal/scale-practice">Scale Practice</a></li>
		<li><a href="/journal/spring-harp">Spring Harp</a></li>
		<li><a href="/journal/cube-peg-torus-hole">Cube Peg, Torus Hole</a></li>
	</ul>
</section>
