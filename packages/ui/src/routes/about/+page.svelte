<script lang="ts">
	import { differenceInYears } from 'date-fns/differenceInYears';

	const years: number = differenceInYears(new Date(), new Date('2009-07-01'));
</script>

<svelte:head>
	<title>about · shane's computer</title>
	<meta
		name="description"
		content="the personal site of shane: ideas, art, creative coding, analysis and play. interactive experiments and write-ups from a software engineer of {years} years."
	/>
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
				<a href="https://evamarie.studio" target="_blank" rel="noopener noreferrer"
					>Eva&nbsp;Marie</a
				>.
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
		<h2>what's all this stuff?</h2>
		<div class="about-section-content">
			<p>
				some posts are kind of like "journal entries"; basically fun little ideas that I've wanted
				to explore such as...
			</p>
			<ul>
				<li>
					<a href="/journal/note-shader">Note Shader</a> which lets you use your computer keyboard
					as a <em>musical</em> keyboard and visualize the notes.
				</li>
				<li>
					<a href="/journal/spring-harp">Spring Harp</a> when music and physics collide (at the time I
					was researching soft-body physics and springs).
				</li>
				<li>
					<a href="/journal/gravity-swell">Gravity Swell</a> a simple exploration of gravity simulation.
				</li>
			</ul>

			<p>some of these are utilities that have helped me out in some way, like...</p>
			<ul>
				<li>
					<a href="/journal/quilt-builder">Quilt Builder</a> - a tool I initially built for
					<a href="https://evamarie.studio" target="_blank" rel="noopener noreferrer">Eva</a> to help
					her design quilted beach blankets. With her design input and help, it has since evolved into
					a more fully-featured utility that helps design quilt patterns and figure out how much fabric
					each color uses.
				</li>
				<li>
					<a href="/journal/scale-practice">Scale Practice</a> - I used this post to generate practice
					scales to help me prepare for jazz solos (I play trumpet).
				</li>
			</ul>

			<p>
				and some are more detailed write-ups of things I've worked on (see
				<a href="/journal/calc-builder">Calc Builder</a>) or things I'm curious about.
			</p>
		</div>
	</div>

	<div class="about-section">
		<h2>and for work?</h2>
		<div class="about-section-content">
			<p>
				I've worked in many industries, but most recently I have spent a lot of time thinking about
				problems in finance. For some of that, check out the story of <a
					href="/journal/calc-builder">Calc Builder</a
				>.
			</p>
			<p>
				If you want my full CV, <a
					href="https://www.linkedin.com/in/shane-d-carroll/"
					target="_blank"
					rel="noopener noreferrer">look me up here</a
				>.
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

	/* Keeps a last line from being one stranded word. */
	.about-section p {
		text-wrap: pretty;
	}

	/*
	 * The marker is drawn rather than left to list-style, because a native one
	 * always sits on the left: on a right-aligned list it travels with the text
	 * and lands in a ragged column. This one hangs in the gutter beside the
	 * text, on whichever side the section is aligned to, level with the first
	 * line so wrapped lines stay flush.
	 */
	.about-section ul {
		list-style: none;
		padding-left: var(--spacing-sm);
		margin-block: var(--spacing-xs);
	}

	.about-section li {
		position: relative;
	}

	.about-section li::before {
		content: '•';
		position: absolute;
		left: calc(-1 * var(--spacing-sm));
		width: var(--spacing-sm);
		text-align: center;
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

		.about-section:nth-of-type(even) ul {
			padding-left: 0;
			padding-right: var(--spacing-sm);
		}

		.about-section:nth-of-type(even) li::before {
			left: auto;
			right: calc(-1 * var(--spacing-sm));
		}
	}
</style>
