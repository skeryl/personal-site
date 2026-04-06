<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import SubwayMap from './SubwayMap.svelte';
	import OverviewMap from './OverviewMap.svelte';
	import SubwayTrain from './SubwayTrain.svelte';
	import SignalSim from './SignalSim.svelte';
	import {
		systemStats,
		boroughStats,
		underservedAreas,
		proposedLines,
		costComparisons,
		getLinesByBenefitScore,
		getTotalProposedCost,
		getTotalProposedRidership,
		lineReportCards,
		getLineGrade,
		formatNumber,
		formatDollars,
		sources,
		type ProposedLine
	} from './data';

	let selectedLine: ProposedLine | null = null;
	let explorationEl: HTMLDivElement;
	let trainEl: HTMLDivElement;
	let trackEl: HTMLDivElement;

	function handleSelectLine(line: ProposedLine | null) {
		selectedLine = line;
	}

	const rankedLines = getLinesByBenefitScore();
	const totalCost = getTotalProposedCost();
	const totalRidership = getTotalProposedRidership();
	const nycAvgCostPerMile =
		costComparisons.filter((c) => c.city === 'New York').reduce((s, c) => s + c.costPerMile, 0) /
		costComparisons.filter((c) => c.city === 'New York').length;
	const intlAvgCostPerMile =
		costComparisons.filter((c) => c.city !== 'New York').reduce((s, c) => s + c.costPerMile, 0) /
		costComparisons.filter((c) => c.city !== 'New York').length;

	let scrollUnsub: (() => void) | null = null;
	let trainY = 0;
	let trainVelocity = 0;
	let targetY = 0;
	let rafId: number;

	onMount(() => {
		function updateTarget() {
			if (!explorationEl || !trackEl) return;
			const rect = explorationEl.getBoundingClientRect();
			const trackRect = trackEl.getBoundingClientRect();
			const viewH = window.innerHeight;

			const totalScroll = rect.height - viewH;
			const scrolled = -rect.top;
			const progress = Math.max(0, Math.min(1, scrolled / totalScroll));

			const trackHeight = trackRect.height;
			const trainHeight = 500;
			targetY = progress * (trackHeight - trainHeight);
		}

		// Train kinematics — trapezoidal velocity profile like a real train
		const ACCEL = 25; // px/s² — how quickly the train gets up to speed
		const DECEL = 30; // px/s² — braking rate (slightly stronger than accel)
		const MAX_SPEED = 175; // px/s — top cruising speed
		let lastTime = performance.now();

		function physicsTick() {
			const now = performance.now();
			const dt = Math.min((now - lastTime) / 1000, 0.1); // seconds, capped
			lastTime = now;

			const distance = targetY - trainY;
			const absDistance = Math.abs(distance);
			const direction = Math.sign(distance);
			const absVelocity = Math.abs(trainVelocity);

			// How far we'd travel if we started braking now
			const brakingDistance = (absVelocity * absVelocity) / (2 * DECEL);

			// Are we moving the wrong way?
			const wrongWay =
				direction !== 0 && Math.sign(trainVelocity) !== direction && absVelocity > 0.5;

			if (absDistance < 0.5 && absVelocity < 1) {
				// Close enough and slow enough — stop
				trainY = targetY;
				trainVelocity = 0;
			} else if (wrongWay) {
				// Moving the wrong direction — brake hard
				trainVelocity -= Math.sign(trainVelocity) * DECEL * 1.5 * dt;
			} else if (brakingDistance >= absDistance - 1) {
				// Need to start braking to stop at target
				trainVelocity -= Math.sign(trainVelocity) * DECEL * dt;
				// Clamp to avoid overshooting past zero
				if (Math.abs(trainVelocity) < 2 && absDistance < 2) {
					trainVelocity = 0;
					trainY = targetY;
				}
			} else {
				// Accelerate toward target, up to max speed
				trainVelocity += direction * ACCEL * dt;
				// Clamp to max speed
				if (Math.abs(trainVelocity) > MAX_SPEED) {
					trainVelocity = Math.sign(trainVelocity) * MAX_SPEED;
				}
			}

			trainY += trainVelocity * dt;

			if (trainEl) {
				trainEl.style.transform = `translateY(${trainY}px)`;
			}

			rafId = requestAnimationFrame(physicsTick);
		}

		window.addEventListener('scroll', updateTarget, { passive: true });
		scrollUnsub = () => window.removeEventListener('scroll', updateTarget);
		updateTarget();
		rafId = requestAnimationFrame(physicsTick);
	});

	onDestroy(() => {
		scrollUnsub?.();
		if (rafId) cancelAnimationFrame(rafId);
	});

	function reveal(node: HTMLElement, options: { delay?: number } = {}) {
		const delay = options.delay ?? 0;
		node.style.opacity = '0';
		node.style.transform = 'translateY(24px)';
		node.style.transition = `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					node.style.opacity = '1';
					node.style.transform = 'none';
					observer.unobserve(node);
				}
			},
			{ threshold: 0.15 }
		);

		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

<div class="exploration" bind:this={explorationEl}>
	<!-- Track + Train -->
	<div class="track-rail" bind:this={trackEl}>
		<div class="track-bed"></div>
		<div class="rail rail-left"></div>
		<div class="rail rail-right"></div>
		<div class="cross-ties"></div>
		<div class="third-rail"></div>
		<div class="station-dot" style="top: 0%"></div>
		<div class="station-dot" style="top: 28%"></div>
		<div class="station-dot" style="top: 54%"></div>
		<div class="station-dot" style="top: 78%"></div>
		<div class="station-dot" style="top: 100%"></div>
		<div class="train" bind:this={trainEl}>
			<SubwayTrain />
		</div>
	</div>

	<div class="content">
		<header class="hero">
			<h1>The Subway Gap</h1>
			<p class="subtitle">
				Who does the NYC subway leave behind, and what would it take to fix it?
			</p>
		</header>

		<!-- OVERVIEW -->
		<section class="section">
			<div class="station-sign" use:reveal>
				<span class="station-sign-dot" style="background: #EE352E"></span>
				<span class="station-sign-name">The System</span>
			</div>

			<div class="intro-text" use:reveal={{ delay: 100 }}>
				<p>
					The New York City subway is the largest rapid transit system in the Western Hemisphere:
					<strong>{systemStats.totalStations} stations</strong>,
					<strong>{systemStats.totalRouteMiles} route miles</strong>,
					<strong>{formatNumber(systemStats.dailyRidership)}</strong> riders every weekday.
				</p>
				<p>
					About {systemStats.percentNYCWithAccess}% of New Yorkers live within half a mile of a
					station. That sounds good until you do the math &mdash; the other {100 -
						systemStats.percentNYCWithAccess}% is
					<strong>{formatNumber(systemStats.populationBeyondHalfMile)} people</strong>. Who are
					they? And how many of them actually need the subway &mdash; no car, long commute, jobs
					that aren't reachable any other way?
				</p>
				<p>
					About 55% of NYC commuters use public transit to get to work. In neighborhoods with good
					subway access, that's a choice. In neighborhoods without it, people either rely on slow
					bus connections, drive, or just don't take the job. The map below shows the gap: green
					where you're close to a station, red where you're not.
				</p>
			</div>

			<div use:reveal={{ delay: 150 }}>
				<OverviewMap />
			</div>

			<div class="stat-grid">
				{#each boroughStats as borough, i}
					<div
						class="stat-card"
						style="border-left: 3px solid {borough.color}"
						use:reveal={{ delay: i * 80 }}
					>
						<div class="stat-borough">{borough.borough}</div>
						<div class="stat-row">
							<span class="stat-label">Population</span>
							<span class="stat-value">{formatNumber(borough.population)}</span>
						</div>
						<div class="stat-row">
							<span class="stat-label">Stations</span>
							<span class="stat-value">{borough.stations}</span>
						</div>
						<div class="stat-row">
							<span class="stat-label">Without access</span>
							<span class="stat-value highlight">{borough.percentWithoutAccess}%</span>
						</div>
						<div class="bar-container">
							<div
								class="bar-fill"
								style="width: {borough.percentWithAccess}%; background: {borough.color}"
							></div>
							<div class="bar-gap" style="width: {borough.percentWithoutAccess}%"></div>
						</div>
						<div class="bar-label">{formatNumber(borough.populationWithoutAccess)} unserved</div>
					</div>
				{/each}
			</div>
		</section>

		<div class="tunnel">
			<div class="tunnel-walls"></div>
		</div>

		<!-- LINE REPORT CARD -->
		<section class="section">
			<div class="station-sign" use:reveal>
				<span class="station-sign-dot" style="background: #B933AD"></span>
				<span class="station-sign-name">The Lines</span>
			</div>

			<h2 use:reveal={{ delay: 80 }}>Which lines actually work?</h2>
			<p class="section-description" use:reveal={{ delay: 120 }}>
				Not all subway lines are created equal. Two have modern signaling. The rest run on
				technology from the 1930s. Here's how they compare.
			</p>

			<div class="report-cards" use:reveal={{ delay: 160 }}>
				{#each lineReportCards.sort((a, b) => b.onTimePercent - a.onTimePercent) as line}
					{@const grade = getLineGrade(line)}
					<div class="report-card">
						<div class="rc-header">
							<div
								class="rc-route-badge"
								style="background: {line.color}; color: {line.color === '#FCCC0A' ||
								line.color === '#A7A9AC'
									? '#111'
									: 'white'}"
							>
								{line.routes}
							</div>
							<div class="rc-name">{line.name}</div>
							<div
								class="rc-grade"
								class:grade-a={grade.startsWith('A')}
								class:grade-b={grade.startsWith('B')}
								class:grade-c={grade.startsWith('C')}
							>
								{grade}
							</div>
						</div>

						<div class="rc-stats">
							<div class="rc-stat">
								<span class="rc-stat-value">{formatNumber(line.dailyRidership)}</span>
								<span class="rc-stat-label">riders/day</span>
							</div>
							<div class="rc-stat">
								<span class="rc-stat-value">{line.peakHeadwayMin}m</span>
								<span class="rc-stat-label">headway</span>
							</div>
							<div class="rc-stat">
								<span class="rc-stat-value">{line.onTimePercent}%</span>
								<span class="rc-stat-label">on-time</span>
							</div>
							<div class="rc-stat">
								<span class="rc-stat-value">{line.stations}</span>
								<span class="rc-stat-label">stations</span>
							</div>
						</div>

						<div class="rc-tags">
							{#if line.hasCBTC}
								<span class="rc-tag rc-tag-good">CBTC</span>
							{:else}
								<span class="rc-tag rc-tag-warn">1930s signals</span>
							{/if}
							{#if line.sharesTrack}
								<span class="rc-tag rc-tag-warn">shared track</span>
							{:else}
								<span class="rc-tag rc-tag-good">own track</span>
							{/if}
						</div>

						<p class="rc-note">{line.note}</p>
					</div>
				{/each}
			</div>
		</section>

		<div class="tunnel">
			<div class="tunnel-walls"></div>
		</div>

		<!-- SIGNAL SIMULATION -->
		<section class="section">
			<div class="station-sign" use:reveal>
				<span class="station-sign-dot" style="background: #FCCC0A"></span>
				<span class="station-sign-name">The Signals</span>
			</div>

			<h2 use:reveal={{ delay: 80 }}>What does CBTC actually mean?</h2>
			<p class="section-description" use:reveal={{ delay: 120 }}>
				This is a simulation of the <strong>F train from W 4th St to Church Ave</strong> &mdash; one
				of the worst-performing segments in the system. The track is divided into fixed blocks with
				signals from the 1930s: the system only knows a train is <em>somewhere</em> in a block, not where
				exactly. CBTC (Communications-Based Train Control) lets each train continuously report its precise
				position, enabling dynamic safety zones and much tighter spacing. The L and 7 trains already run
				this way. Watch the same stretch of track under both systems:
			</p>

			<div use:reveal={{ delay: 160 }}>
				<SignalSim />
			</div>

			<div class="signal-callouts" use:reveal={{ delay: 200 }}>
				<div class="callout">
					<div class="callout-title">Simulate a delay</div>
					<p>
						A 30-second door hold at Jay St. On fixed-block, watch the cascade ripple backward
						through red signals. CBTC trains recover faster because they can creep closer to the
						stopped train.
					</p>
				</div>
				<div class="callout">
					<div class="callout-title">Toggle cross traffic</div>
					<p>
						The F shares track with A/C trains at Jay St and G trains from Bergen to 15th St.
						Junction conflicts compound delays &mdash; one late A train can stall the entire F line
						under fixed-block.
					</p>
				</div>
			</div>
		</section>

		<div class="tunnel">
			<div class="tunnel-walls"></div>
		</div>

		<!-- UNDERSERVED -->
		<section class="section">
			<div class="station-sign" use:reveal>
				<span class="station-sign-dot" style="background: #ff4757"></span>
				<span class="station-sign-name">The Gaps</span>
			</div>

			<h2 use:reveal={{ delay: 80 }}>So who's getting left out?</h2>
			<p class="section-description" use:reveal={{ delay: 120 }}>
				These are the neighborhoods farthest from a station. Some have over 100,000 people with no
				subway at all &mdash; just buses, or nothing.
			</p>

			<div use:reveal={{ delay: 160 }}>
				<SubwayMap
					{proposedLines}
					{underservedAreas}
					{selectedLine}
					onSelectLine={handleSelectLine}
				/>
			</div>

			<div class="area-grid">
				{#each underservedAreas.sort((a, b) => b.nearestStationMiles - a.nearestStationMiles) as area, i}
					<div class="area-card" use:reveal={{ delay: i * 60 }}>
						<div class="area-header">
							<h3>{area.name}</h3>
							<span class="area-borough">{area.borough}</span>
						</div>
						<div class="area-stats">
							<div class="area-stat">
								<span class="area-stat-value">{area.nearestStationMiles} mi</span>
								<span class="area-stat-label">to nearest station</span>
							</div>
							<div class="area-stat">
								<span class="area-stat-value">{formatNumber(area.population)}</span>
								<span class="area-stat-label">population</span>
							</div>
							<div class="area-stat">
								<span class="area-stat-value">${(area.medianIncome / 1000).toFixed(0)}K</span>
								<span class="area-stat-label">median income</span>
							</div>
						</div>
						<p class="area-description">{area.description}</p>
					</div>
				{/each}
			</div>
		</section>

		<div class="tunnel">
			<div class="tunnel-walls"></div>
		</div>

		<!-- PROPOSALS -->
		<section class="section">
			<div class="station-sign" use:reveal>
				<span class="station-sign-dot" style="background: #2ed573"></span>
				<span class="station-sign-name">The Fix</span>
			</div>

			<h2 use:reveal={{ delay: 80 }}>What would it take to fix it?</h2>
			<p class="section-description" use:reveal={{ delay: 120 }}>
				{proposedLines.length} proposed lines, {formatNumber(totalRidership)} daily riders, {formatDollars(
					totalCost
				)} estimated cost. Click a line to explore it on the map.
			</p>

			<div class="proposals-split" use:reveal={{ delay: 160 }}>
				<div class="proposals-list">
					{#each rankedLines as line}
						<button
							class="line-card"
							class:selected={selectedLine?.id === line.id}
							on:click={() => handleSelectLine(selectedLine?.id === line.id ? null : line)}
						>
							<div class="line-header">
								<div class="line-color" style="background: {line.color}"></div>
								<div class="line-title">
									<h3>{line.name}</h3>
									<span class="line-status status-{line.status}"
										>{line.status.replace('_', ' ')}</span
									>
								</div>
								<div class="line-score">
									<span class="score-value">{line.benefitScore}</span>
									<span class="score-label">score</span>
								</div>
							</div>

							{#if selectedLine?.id === line.id}
								<div class="line-detail">
									<p>{line.description}</p>
									<div class="line-stats">
										<div class="line-stat">
											<span class="ls-value">{line.lengthMiles} mi</span>
											<span class="ls-label">length</span>
										</div>
										<div class="line-stat">
											<span class="ls-value">{formatDollars(line.estimatedCostBillions)}</span>
											<span class="ls-label">est. cost</span>
										</div>
										<div class="line-stat">
											<span class="ls-value">{formatNumber(line.estimatedRidership)}/day</span>
											<span class="ls-label">ridership</span>
										</div>
										<div class="line-stat">
											<span class="ls-value">${line.costPerMile.toFixed(1)}B/mi</span>
											<span class="ls-label">cost/mile</span>
										</div>
									</div>
									<div class="neighborhoods">
										{#each line.neighborhoods as n}
											<span class="neighborhood-tag">{n}</span>
										{/each}
									</div>
								</div>
							{/if}
						</button>
					{/each}
				</div>
				<div class="proposals-map">
					<SubwayMap
						{proposedLines}
						{underservedAreas}
						{selectedLine}
						onSelectLine={handleSelectLine}
					/>
				</div>
			</div>
		</section>

		<div class="tunnel">
			<div class="tunnel-walls"></div>
		</div>

		<!-- COSTS -->
		<section class="section">
			<div class="station-sign" use:reveal>
				<span class="station-sign-dot" style="background: #FCCC0A"></span>
				<span class="station-sign-name">The Price</span>
			</div>

			<h2 use:reveal={{ delay: 80 }}>But why does it cost so much?</h2>
			<p class="section-description" use:reveal={{ delay: 120 }}>
				New York builds subway infrastructure at
				<strong>${nycAvgCostPerMile.toFixed(1)}B per mile</strong> &mdash; roughly
				<strong>{(nycAvgCostPerMile / intlAvgCostPerMile).toFixed(0)}x</strong> the international average.
				That gap is the reason most of these proposals stay proposals.
			</p>

			<div class="cost-chart" use:reveal={{ delay: 160 }}>
				{#each [...costComparisons].sort((a, b) => b.costPerMile - a.costPerMile) as comparison}
					<div class="cost-row">
						<div class="cost-info">
							<span class="cost-project">{comparison.project}</span>
							<span class="cost-city">{comparison.city} ({comparison.year})</span>
						</div>
						<div class="cost-bar-container">
							<div
								class="cost-bar"
								style="width: {Math.min((comparison.costPerMile / 4) * 100, 100)}%;
                       background: {comparison.city === 'New York' ? '#ff4757' : '#2ed573'}"
							></div>
							<span class="cost-amount">${comparison.costPerMile.toFixed(2)}B/mi</span>
						</div>
					</div>
				{/each}
			</div>

			<div class="cost-factors" use:reveal>
				<h3>Key Cost Drivers in NYC</h3>
				<div class="factor-grid">
					<div class="factor-card">
						<div class="factor-title">Labor Rules</div>
						<p>
							NYC tunnel projects employ 3&ndash;4x more workers than comparable international
							projects due to union agreements and outdated staffing requirements.
						</p>
					</div>
					<div class="factor-card">
						<div class="factor-title">Station Design</div>
						<p>
							NYC builds cavernous, over-engineered stations. The 96th St station on SAS Phase 1
							required excavating 800,000 cubic yards of rock.
						</p>
					</div>
					<div class="factor-card">
						<div class="factor-title">Utility Relocation</div>
						<p>
							NYC's dense underground infrastructure (steam, electrical, sewage, telecom) must be
							relocated before tunneling, adding billions.
						</p>
					</div>
					<div class="factor-card">
						<div class="factor-title">Environmental Review</div>
						<p>
							Environmental impact assessments and community review can add 5&ndash;10 years before
							construction begins.
						</p>
					</div>
					<div class="factor-card">
						<div class="factor-title">Lack of Competition</div>
						<p>
							A small pool of contractors capable of NYC mega-projects limits competitive bidding.
							International firms face barriers to entry.
						</p>
					</div>
					<div class="factor-card">
						<div class="factor-title">Change Orders</div>
						<p>
							Scope creep and design changes during construction routinely add 30&ndash;50% to
							initial estimates.
						</p>
					</div>
				</div>
			</div>

			<div class="what-if" use:reveal>
				<h3>What If NYC Built at International Costs?</h3>
				<p>
					If New York could build at the international average of
					<strong>${intlAvgCostPerMile.toFixed(2)}B per mile</strong>, the entire proposed expansion
					of {proposedLines.reduce((s, l) => s + l.lengthMiles, 0).toFixed(0)} miles could be built for
					<strong
						>{formatDollars(
							proposedLines.reduce((s, l) => s + l.lengthMiles, 0) * intlAvgCostPerMile
						)}</strong
					>
					instead of <strong>{formatDollars(totalCost)}</strong>.
				</p>
				<p>
					That's a savings of
					<strong
						>{formatDollars(
							totalCost - proposedLines.reduce((s, l) => s + l.lengthMiles, 0) * intlAvgCostPerMile
						)}</strong
					>
					&mdash; enough to fund nearly the entire expansion program with money to spare.
				</p>
			</div>
		</section>

		<footer class="exploration-footer" use:reveal>
			<p>
				Data compiled from MTA capital plans, U.S. Census Bureau, Regional Plan Association reports,
				TransitCenter analyses, and international transit cost research by the NYU Marron Institute.
				Ridership and cost figures are estimates based on publicly available projections.
				Populations from the 2020 Census; median incomes from 2023 American Community Survey.
			</p>
			<details class="sources">
				<summary>Sources</summary>
				<ol>
					{#each sources as source, i}
						<li id="source-{source.id}">
							<a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>
						</li>
					{/each}
				</ol>
			</details>
		</footer>
	</div>
</div>

<style>
	.exploration {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 16px 64px;
		color: #2a2a2a;
		position: relative;
		display: flex;
		gap: 0;
	}

	/* ---- Track + Train ---- */
	.track-rail {
		position: absolute;
		left: 8px;
		top: 120px;
		bottom: 80px;
		width: 56px;
		z-index: 2;
	}

	.track-bed {
		position: absolute;
		inset: 0;
		background: #3a3530;
		border-radius: 2px;
		background-image:
			radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
			radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
			radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
		background-size:
			7px 7px,
			11px 11px,
			5px 5px;
	}

	.rail {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 3px;
		background: linear-gradient(
			180deg,
			#8a8a90 0%,
			#aaaaae 3%,
			#7a7a80 6%,
			#9a9a9e 9%,
			#8a8a90 12%
		);
		background-size: 100% 40px;
		border-radius: 1px;
		box-shadow:
			inset 1px 0 0 rgba(255, 255, 255, 0.2),
			0 0 3px rgba(0, 0, 0, 0.4);
	}

	.rail-left {
		left: 10px;
	}
	.rail-right {
		right: 10px;
	}

	.cross-ties {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			180deg,
			transparent 0px,
			transparent 14px,
			#4a4035 14px,
			#5a4d40 16px,
			#4a4035 18px,
			transparent 18px
		);
		left: 4px;
		right: 4px;
	}

	.third-rail {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 4px;
		width: 2px;
		background: linear-gradient(180deg, #6a6a70 0%, #7a7a80 50%, #6a6a70 100%);
		background-size: 100% 30px;
		opacity: 0.5;
	}

	.station-dot {
		position: absolute;
		left: 50%;
		width: 12px;
		height: 12px;
		margin-left: -6px;
		margin-top: -6px;
		border-radius: 50%;
		background: white;
		border: 2.5px solid #555;
		z-index: 4;
		box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
	}

	.train {
		position: absolute;
		left: 50%;
		top: 0;
		width: 56px;
		height: 500px;
		margin-left: -28px;
		z-index: 5;
		filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
	}

	.content {
		flex: 1;
		min-width: 0;
		padding-left: 52px;
	}

	/* ---- Hero ---- */
	.hero {
		text-align: center;
		padding: 48px 0 32px;
	}

	.hero h1 {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		margin: 0;
		color: #1a1a1a;
	}

	.subtitle {
		font-size: 1.15rem;
		color: rgba(0, 0, 0, 0.45);
		margin-top: 8px;
	}

	/* ---- Station signs ---- */
	.station-sign {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		padding: 8px 14px;
		background: #111;
		border-radius: 6px;
		width: fit-content;
	}

	.station-sign-dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.station-sign-name {
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: white;
	}

	/* ---- Tunnel dividers ---- */
	.tunnel {
		height: 80px;
		position: relative;
		margin: 40px 0;
		overflow: hidden;
	}

	.tunnel-walls {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 100% 50% at 50% 50%,
			transparent 40%,
			rgba(0, 0, 0, 0.08) 100%
		);
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	}

	.tunnel-walls::before {
		content: '';
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 18px,
			rgba(0, 0, 0, 0.03) 18px,
			rgba(0, 0, 0, 0.03) 19px
		);
	}

	/* ---- Sections ---- */
	.section {
		margin-bottom: 0;
	}

	.section h2 {
		font-size: 1.6rem;
		font-weight: 600;
		margin: 0 0 8px;
		color: #1a1a1a;
	}

	.section-description {
		color: rgba(0, 0, 0, 0.5);
		margin-bottom: 24px;
		line-height: 1.6;
	}

	.intro-text {
		margin-bottom: 32px;
		line-height: 1.7;
		font-size: 1.05rem;
	}

	.intro-text p {
		margin: 0 0 16px;
	}
	.intro-text strong {
		color: #111;
		font-weight: 700;
	}

	/* Borough stat cards */
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
		gap: 12px;
		margin-top: 24px;
	}

	.stat-card {
		background: rgba(0, 0, 0, 0.03);
		border-radius: 10px;
		padding: 16px;
	}

	.stat-borough {
		font-weight: 600;
		font-size: 15px;
		margin-bottom: 10px;
		color: #1a1a1a;
	}
	.stat-row {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		margin: 4px 0;
	}
	.stat-label {
		color: rgba(0, 0, 0, 0.45);
	}
	.stat-value {
		font-weight: 500;
	}
	.stat-value.highlight {
		color: #d63031;
	}

	.bar-container {
		display: flex;
		height: 6px;
		border-radius: 3px;
		overflow: hidden;
		margin-top: 10px;
		background: rgba(0, 0, 0, 0.06);
	}
	.bar-fill {
		border-radius: 3px 0 0 3px;
		transition: width 0.6s ease;
	}
	.bar-gap {
		background: rgba(214, 48, 49, 0.2);
	}
	.bar-label {
		font-size: 11px;
		color: rgba(0, 0, 0, 0.35);
		margin-top: 4px;
	}

	/* Underserved area cards */
	.area-grid {
		display: grid;
		gap: 12px;
		margin-top: 24px;
	}

	.area-card {
		background: rgba(0, 0, 0, 0.03);
		border-radius: 10px;
		padding: 16px;
	}

	.area-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 10px;
	}
	.area-header h3 {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
		color: #1a1a1a;
	}
	.area-borough {
		font-size: 12px;
		color: rgba(0, 0, 0, 0.4);
	}
	.area-stats {
		display: flex;
		gap: 20px;
		margin-bottom: 10px;
	}
	.area-stat {
		display: flex;
		flex-direction: column;
	}
	.area-stat-value {
		font-size: 16px;
		font-weight: 600;
		color: #d63031;
	}
	.area-stat-label {
		font-size: 11px;
		color: rgba(0, 0, 0, 0.4);
	}
	.area-description {
		font-size: 13px;
		color: rgba(0, 0, 0, 0.55);
		line-height: 1.5;
		margin: 0;
	}

	/* Proposals split layout */
	.proposals-split {
		display: grid;
		grid-template-columns: 2fr 3fr;
		gap: 16px;
		align-items: start;
	}

	.proposals-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.proposals-map {
		position: sticky;
		top: 16px;
	}

	/* Proposal cards */

	.line-card {
		background: rgba(0, 0, 0, 0.03);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 10px;
		padding: 14px 16px;
		cursor: pointer;
		transition:
			background 0.2s,
			border-color 0.2s;
		text-align: left;
		width: 100%;
		color: inherit;
		font: inherit;
	}
	.line-card:hover {
		background: rgba(0, 0, 0, 0.05);
	}
	.line-card.selected {
		background: rgba(0, 0, 0, 0.06);
		border-color: rgba(0, 0, 0, 0.12);
	}

	.line-header {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.line-color {
		width: 4px;
		height: 36px;
		border-radius: 2px;
		flex-shrink: 0;
	}
	.line-title {
		flex: 1;
	}
	.line-title h3 {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
		color: #1a1a1a;
	}
	.line-status {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.status-planned {
		color: #00a854;
	}
	.status-proposed {
		color: #d48806;
	}
	.status-advocacy {
		color: #888;
	}
	.status-under_construction {
		color: #1677ff;
	}

	.line-score {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 44px;
	}
	.score-value {
		font-size: 20px;
		font-weight: 700;
		color: #00a854;
	}
	.score-label {
		font-size: 10px;
		color: rgba(0, 0, 0, 0.35);
	}

	.line-detail {
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
	}
	.line-detail p {
		font-size: 13px;
		color: rgba(0, 0, 0, 0.6);
		line-height: 1.6;
		margin: 0 0 14px;
	}
	.line-stats {
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	.line-stat {
		display: flex;
		flex-direction: column;
	}
	.ls-value {
		font-size: 15px;
		font-weight: 600;
		color: #1a1a1a;
	}
	.ls-label {
		font-size: 11px;
		color: rgba(0, 0, 0, 0.4);
	}
	.neighborhoods {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.neighborhood-tag {
		font-size: 11px;
		padding: 2px 8px;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 4px;
		color: rgba(0, 0, 0, 0.55);
	}

	/* Line report cards */
	.report-cards {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.report-card {
		background: rgba(0, 0, 0, 0.03);
		border-radius: 10px;
		padding: 16px;
	}

	.rc-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.rc-route-badge {
		font-size: 13px;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 4px;
		white-space: nowrap;
	}

	.rc-name {
		flex: 1;
		font-weight: 600;
		font-size: 15px;
		color: #1a1a1a;
	}

	.rc-grade {
		font-size: 20px;
		font-weight: 800;
		min-width: 36px;
		text-align: center;
	}
	.rc-grade.grade-a {
		color: #00a854;
	}
	.rc-grade.grade-b {
		color: #d48806;
	}
	.rc-grade.grade-c {
		color: #d63031;
	}

	.rc-stats {
		display: flex;
		gap: 16px;
		margin-bottom: 8px;
		flex-wrap: wrap;
	}

	.rc-stat {
		display: flex;
		flex-direction: column;
	}
	.rc-stat-value {
		font-size: 14px;
		font-weight: 600;
		color: #1a1a1a;
	}
	.rc-stat-label {
		font-size: 10px;
		color: rgba(0, 0, 0, 0.4);
	}

	.rc-tags {
		display: flex;
		gap: 6px;
		margin-bottom: 8px;
	}

	.rc-tag {
		font-size: 10px;
		padding: 2px 7px;
		border-radius: 3px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.rc-tag-good {
		background: rgba(0, 168, 84, 0.1);
		color: #00a854;
	}
	.rc-tag-warn {
		background: rgba(214, 48, 49, 0.08);
		color: #d63031;
	}

	.rc-note {
		font-size: 13px;
		color: rgba(0, 0, 0, 0.55);
		line-height: 1.5;
		margin: 0;
	}

	/* Cost comparison */
	.cost-chart {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 32px;
	}
	.cost-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.cost-info {
		min-width: 200px;
		flex-shrink: 0;
	}
	.cost-project {
		display: block;
		font-size: 13px;
		font-weight: 500;
		color: #1a1a1a;
	}
	.cost-city {
		display: block;
		font-size: 11px;
		color: rgba(0, 0, 0, 0.4);
	}
	.cost-bar-container {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.cost-bar {
		height: 20px;
		border-radius: 4px;
		transition: width 0.6s ease;
		min-width: 4px;
	}
	.cost-amount {
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		color: #1a1a1a;
	}

	/* Cost factors */
	.cost-factors {
		margin-bottom: 32px;
	}
	.cost-factors h3 {
		font-size: 1.2rem;
		margin: 0 0 16px;
		color: #1a1a1a;
	}
	.factor-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 12px;
	}
	.factor-card {
		background: rgba(0, 0, 0, 0.03);
		border-radius: 10px;
		padding: 16px;
	}
	.factor-title {
		font-weight: 600;
		font-size: 14px;
		margin-bottom: 6px;
		color: #d63031;
	}
	.factor-card p {
		font-size: 13px;
		color: rgba(0, 0, 0, 0.55);
		line-height: 1.5;
		margin: 0;
	}

	/* What-if */
	.what-if {
		background: rgba(0, 168, 84, 0.06);
		border: 1px solid rgba(0, 168, 84, 0.15);
		border-radius: 12px;
		padding: 24px;
	}
	.what-if h3 {
		font-size: 1.2rem;
		margin: 0 0 12px;
		color: #00a854;
	}
	.what-if p {
		font-size: 14px;
		line-height: 1.6;
		margin: 0 0 10px;
		color: rgba(0, 0, 0, 0.65);
	}
	.what-if strong {
		color: #1a1a1a;
	}

	/* Footer */
	.exploration-footer {
		margin-top: 56px;
		padding-top: 24px;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
	}
	.exploration-footer p {
		font-size: 12px;
		color: rgba(0, 0, 0, 0.35);
		line-height: 1.6;
	}
	.sources {
		margin-top: 16px;
	}
	.sources summary {
		font-size: 12px;
		color: rgba(0, 0, 0, 0.4);
		cursor: pointer;
		font-weight: 500;
	}
	.sources summary:hover {
		color: rgba(0, 0, 0, 0.6);
	}
	.sources ol {
		margin-top: 8px;
		padding-left: 20px;
	}
	.sources li {
		font-size: 11px;
		color: rgba(0, 0, 0, 0.35);
		line-height: 1.8;
	}
	.sources a {
		color: rgba(0, 0, 0, 0.45);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.sources a:hover {
		color: rgba(0, 0, 0, 0.7);
	}

	/* Signal sim callouts */
	.signal-callouts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 16px;
	}

	.callout {
		background: rgba(0, 0, 0, 0.04);
		border-radius: 10px;
		padding: 16px;
	}

	.callout-title {
		font-weight: 600;
		font-size: 14px;
		margin-bottom: 6px;
		color: #1a1a1a;
	}

	.callout p {
		font-size: 13px;
		color: rgba(0, 0, 0, 0.5);
		line-height: 1.5;
		margin: 0;
	}

	@media (max-width: 640px) {
		.track-rail {
			display: none;
		}
		.content {
			padding-left: 0;
		}
		.hero h1 {
			font-size: 1.8rem;
		}
		.stat-grid {
			grid-template-columns: 1fr 1fr;
		}
		.area-stats {
			flex-wrap: wrap;
			gap: 12px;
		}
		.cost-row {
			flex-direction: column;
			align-items: flex-start;
		}
		.cost-info {
			min-width: unset;
		}
		.cost-bar-container {
			width: 100%;
		}
		.factor-grid {
			grid-template-columns: 1fr;
		}
		.proposals-split {
			grid-template-columns: 1fr;
		}
		.proposals-map {
			position: static;
		}
		.signal-callouts {
			grid-template-columns: 1fr;
		}
	}
</style>
