<script lang="ts">
	import { differenceInYears } from 'date-fns/differenceInYears';

	const years: number = differenceInYears(new Date(), new Date('2009-07-01'));
</script>

<svelte:head>
	<title>shane's computer</title>
</svelte:head>

<section class="about py-2 flex flex-col">
	<h1 class="text-gray-400">what is shane's computer?</h1>
	<div class="about-section">
		<h2>hello, I'm Shane</h2>
		<div class="about-section-content">
			<p>
				welcome to my personal site! this is my space for ideas, art, creative coding, analysis,
				play, etc.
			</p>
			<p>I'm a professional software engineer with about {years} years of experience.</p>
		</div>
	</div>

	<div class="about-section">
		<h2>a little bit about Eva Marie</h2>
		<div class="about-section-content">
			<p>
				You might notice that <strong>some</strong> things on this site look
				<strong>objectively good</strong>. Usually, those are things designed by or with
				art-direction from
				<a href="https://evamarie.studio" target="_blank" rel="noopener noreferrer">Eva Marie</a>
			</p>
			<ul>
				<li><a href="/journal/blob-grid">Blob Grid</a></li>
				<li><a href="/journal/blob-convergence">Blob Convergence</a></li>
				<li>
					<a href="/journal/quilt-builder">Quilt Builder</a>
				</li>
			</ul>
		</div>
	</div>

	<div class="about-section">
		<h2>what are these</h2>
		<div class="about-section-content">
			<p>
				all my posts are kind of like "journal entries". basically these are fun little ideas that
				I've wanted to explore such as...
			</p>
			<ul>
				<li>
					<a href="/journal/note-shader">"Note Shader"</a> which lets you use your computer keyboard
					as a <i>musical</i> keyboard and visualizing the notes
				</li>
				<li><a href="/journal/quilt-builder">Quilt Builder</a></li>
				<li><a href="/journal/scale-practice">Scale Practice</a></li>
				<li><a href="/journal/spring-harp">Spring Harp</a></li>
			</ul>
			<p>
				other posts are just exploratory "how do I even configure this software to draw stuff?":
			</p>
			<ul>
				<li><a href="/journal/cube-peg-torus-hole">Cube Peg Torus Hole</a></li>
			</ul>
		</div>
	</div>

	<div class="about-section">
		<h2>and for work?</h2>
		<div class="about-section-content">
			<p>
				I've worked in many industries, but most recently I have spent a lot of time thinking about
				problems in finance. For some of that, check out the story of <a
					href="/journal/calc-builder">Calc Builder</a
				> in which I explore . In that exploration, I rebuilt it as a small demo from memory to help show
				.
			</p>
			<p>
				If you want my full CV, <a href="https://www.linkedin.com/in/shane-d-carroll/"
					>look me up here</a
				>
			</p>
		</div>
	</div>
</section>

<style>
	/*
	 * Sections alternate left and right. Each one is a single block no wider
	 * than a comfortable line, so the heading, the prose and the list all share
	 * one edge and read as one piece. The page itself is capped and centred,
	 * which is what gives the margins at large sizes.
	 */
	.about {
		max-width: 72rem;
		margin-inline: auto;
	}

	.about-section {
		max-width: 34rem;
		margin-block: var(--spacing-md);
	}

	.about-section-content {
		display: flex;
		flex-direction: column;
	}

	.about-section p:last-of-type {
		padding-bottom: 0;
	}

	.about-section ul {
		list-style: disc;
		/* Bullets hang outside, so wrapped lines stay flush with the text. */
		padding-left: var(--spacing-sm);
		margin-block: var(--spacing-xs);
	}

	/*
	 * Only stagger once there is room for it: below this the sections would be
	 * too narrow to tell left from right, and ragged edges just cost legibility.
	 */
	@media (min-width: 64rem) {
		.about-section:nth-of-type(even) {
			margin-left: auto;
			text-align: right;
		}

		/*
		 * Bullets travel with the text when it is right-aligned, so they land in
		 * a ragged column. The right edge already groups these few links.
		 */
		.about-section:nth-of-type(even) ul {
			list-style: none;
			padding-left: 0;
		}
	}
</style>
