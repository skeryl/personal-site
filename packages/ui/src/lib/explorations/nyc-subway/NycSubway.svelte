<script lang="ts">
  import { onMount } from 'svelte';
  import SubwayMap from './SubwayMap.svelte';
  import {
    systemStats,
    boroughStats,
    underservedAreas,
    proposedLines,
    costComparisons,
    getLinesByBenefitScore,
    getTotalProposedCost,
    getTotalProposedRidership,
    formatNumber,
    formatDollars,
    type ProposedLine,
  } from './data';

  let selectedLine: ProposedLine | null = null;
  let activeSection: string = 'overview';
  let mounted = false;

  onMount(() => {
    mounted = true;
  });

  function handleSelectLine(line: ProposedLine | null) {
    selectedLine = line;
    if (line) activeSection = 'proposals';
  }

  const rankedLines = getLinesByBenefitScore();
  const totalCost = getTotalProposedCost();
  const totalRidership = getTotalProposedRidership();
  const nycAvgCostPerMile =
    costComparisons
      .filter((c) => c.city === 'New York')
      .reduce((s, c) => s + c.costPerMile, 0) /
    costComparisons.filter((c) => c.city === 'New York').length;
  const intlAvgCostPerMile =
    costComparisons
      .filter((c) => c.city !== 'New York')
      .reduce((s, c) => s + c.costPerMile, 0) /
    costComparisons.filter((c) => c.city !== 'New York').length;

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'underserved', label: 'Underserved' },
    { id: 'proposals', label: 'Proposals' },
    { id: 'costs', label: 'Costs' },
  ];
</script>

<div class="exploration">
  <header class="hero">
    <h1>The Subway Gap</h1>
    <p class="subtitle">
      Who does the NYC subway leave behind, and what would it take to fix it?
    </p>
  </header>

  <nav class="section-nav">
    {#each sections as section}
      <button
        class="nav-btn"
        class:active={activeSection === section.id}
        on:click={() => (activeSection = section.id)}
      >
        {section.label}
      </button>
    {/each}
  </nav>

  <!-- OVERVIEW -->
  {#if activeSection === 'overview'}
    <section class="section">
      <div class="intro-text">
        <p>
          The New York City subway is the largest rapid transit system in the Western Hemisphere,
          with <strong>{systemStats.totalStations} stations</strong> across
          <strong>{systemStats.totalRouteMiles} route miles</strong>. It carries
          <strong>{formatNumber(systemStats.dailyRidership)}</strong> riders daily.
        </p>
        <p>
          But it doesn't serve everyone equally. An estimated
          <strong>{formatNumber(systemStats.populationBeyondHalfMile)} New Yorkers</strong>
          &mdash; roughly <strong>{100 - systemStats.percentNYCWithAccess}%</strong> of the city
          &mdash; live more than half a mile from a subway station. These residents face longer commutes,
          fewer job opportunities, and reduced access to healthcare, education, and culture.
        </p>
      </div>

      <div class="stat-grid">
        {#each boroughStats as borough}
          <div class="stat-card" style="border-left: 3px solid {borough.color}">
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
              <div
                class="bar-gap"
                style="width: {borough.percentWithoutAccess}%"
              ></div>
            </div>
            <div class="bar-label">
              <span>{formatNumber(borough.populationWithoutAccess)} unserved</span>
            </div>
          </div>
        {/each}
      </div>
    </section>

  <!-- UNDERSERVED -->
  {:else if activeSection === 'underserved'}
    <section class="section">
      <h2>NYC's Most Underserved Neighborhoods</h2>
      <p class="section-description">
        Red markers show underserved communities. Size reflects population.
        Click a marker for details.
      </p>

      <SubwayMap
        {proposedLines}
        {underservedAreas}
        {selectedLine}
        onSelectLine={handleSelectLine}
      />

      <div class="area-grid">
        {#each underservedAreas.sort((a, b) => b.nearestStationMiles - a.nearestStationMiles) as area}
          <div class="area-card">
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

  <!-- PROPOSALS -->
  {:else if activeSection === 'proposals'}
    <section class="section">
      <h2>Proposed Expansion Lines</h2>
      <p class="section-description">
        Ranked by a benefit score that weighs ridership impact, cost efficiency, and equity.
        Click a line on the map or in the list to explore it.
      </p>

      <SubwayMap
        {proposedLines}
        {underservedAreas}
        {selectedLine}
        onSelectLine={handleSelectLine}
      />

      <div class="proposals-summary">
        <div class="summary-stat">
          <span class="summary-value">{proposedLines.length}</span>
          <span class="summary-label">proposed lines</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{formatDollars(totalCost)}</span>
          <span class="summary-label">total est. cost</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{formatNumber(totalRidership)}</span>
          <span class="summary-label">daily riders added</span>
        </div>
      </div>

      <div class="line-list">
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
                <span class="line-status status-{line.status}">{line.status.replace('_', ' ')}</span>
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
    </section>

  <!-- COSTS -->
  {:else if activeSection === 'costs'}
    <section class="section">
      <h2>Why Does NYC Pay So Much?</h2>
      <p class="section-description">
        New York City builds subway infrastructure at
        <strong>${nycAvgCostPerMile.toFixed(1)}B per mile</strong> on average &mdash;
        roughly <strong>{(nycAvgCostPerMile / intlAvgCostPerMile).toFixed(0)}x</strong> the
        international average of <strong>${intlAvgCostPerMile.toFixed(2)}B per mile</strong>.
      </p>

      <div class="cost-chart">
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

      <div class="cost-factors">
        <h3>Key Cost Drivers in NYC</h3>
        <div class="factor-grid">
          <div class="factor-card">
            <div class="factor-title">Labor Rules</div>
            <p>
              NYC tunnel projects employ 3&ndash;4x more workers than comparable international projects
              due to union agreements and outdated staffing requirements dating back decades.
            </p>
          </div>
          <div class="factor-card">
            <div class="factor-title">Station Design</div>
            <p>
              NYC builds cavernous, over-engineered stations. The 96th St station on SAS Phase 1
              required excavating 800,000 cubic yards of rock for a single station.
            </p>
          </div>
          <div class="factor-card">
            <div class="factor-title">Utility Relocation</div>
            <p>
              NYC's dense underground infrastructure (steam pipes, electrical, sewage, telecom)
              must be relocated before tunneling, adding billions in costs.
            </p>
          </div>
          <div class="factor-card">
            <div class="factor-title">Environmental Review</div>
            <p>
              Environmental impact assessments and community review processes can add 5&ndash;10 years
              before construction begins, with costs compounding over time.
            </p>
          </div>
          <div class="factor-card">
            <div class="factor-title">Lack of Competition</div>
            <p>
              A small pool of contractors capable of NYC mega-projects limits competitive bidding,
              keeping prices inflated. International firms face barriers to entry.
            </p>
          </div>
          <div class="factor-card">
            <div class="factor-title">Change Orders</div>
            <p>
              Scope creep and design changes during construction routinely add 30&ndash;50% to initial
              estimates. Poor upfront planning creates cascading delays.
            </p>
          </div>
        </div>
      </div>

      <div class="what-if">
        <h3>What If NYC Built at International Costs?</h3>
        <p>
          If New York could build subway infrastructure at the international average of
          <strong>${intlAvgCostPerMile.toFixed(2)}B per mile</strong>, the entire proposed expansion
          of {proposedLines.reduce((s, l) => s + l.lengthMiles, 0).toFixed(0)} miles could be built for
          approximately <strong>{formatDollars(proposedLines.reduce((s, l) => s + l.lengthMiles, 0) * intlAvgCostPerMile)}</strong>
          instead of <strong>{formatDollars(totalCost)}</strong>.
        </p>
        <p>
          That's a savings of
          <strong>{formatDollars(totalCost - proposedLines.reduce((s, l) => s + l.lengthMiles, 0) * intlAvgCostPerMile)}</strong>
          &mdash; enough to fund nearly the entire expansion program with money to spare.
        </p>
      </div>
    </section>
  {/if}

  <footer class="exploration-footer">
    <p>
      Data compiled from MTA capital plans, Regional Plan Association reports,
      TransitCenter analyses, and international transit cost research by the NYU Marron Institute.
      Ridership and cost figures are estimates based on publicly available projections.
    </p>
  </footer>
</div>

<style>
  .exploration {
    max-width: 900px;
    margin: 0 auto;
    padding: 24px 16px;
    color: rgba(255, 255, 255, 0.9);
  }

  .hero {
    text-align: center;
    padding: 48px 0 32px;
  }

  .hero h1 {
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0;
  }

  .subtitle {
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.55);
    margin-top: 8px;
  }

  .section-nav {
    display: flex;
    gap: 4px;
    justify-content: center;
    margin-bottom: 32px;
    background: rgba(255, 255, 255, 0.05);
    padding: 4px;
    border-radius: 10px;
  }

  .nav-btn {
    padding: 8px 20px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover {
    color: rgba(255, 255, 255, 0.8);
  }

  .nav-btn.active {
    background: rgba(255, 255, 255, 0.12);
    color: white;
  }

  .section {
    margin-bottom: 48px;
  }

  .section h2 {
    font-size: 1.6rem;
    font-weight: 600;
    margin: 0 0 8px;
  }

  .section-description {
    color: rgba(255, 255, 255, 0.5);
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
    color: white;
  }

  /* Borough stat cards */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 10px;
    padding: 16px;
  }

  .stat-borough {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 10px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin: 4px 0;
  }

  .stat-label {
    color: rgba(255, 255, 255, 0.45);
  }

  .stat-value {
    font-weight: 500;
  }

  .stat-value.highlight {
    color: #ff4757;
  }

  .bar-container {
    display: flex;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    margin-top: 10px;
    background: rgba(255, 255, 255, 0.08);
  }

  .bar-fill {
    border-radius: 3px 0 0 3px;
    transition: width 0.6s ease;
  }

  .bar-gap {
    background: rgba(255, 71, 87, 0.25);
  }

  .bar-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
    margin-top: 4px;
  }

  /* Underserved area cards */
  .area-grid {
    display: grid;
    gap: 12px;
    margin-top: 24px;
  }

  .area-card {
    background: rgba(255, 255, 255, 0.04);
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
  }

  .area-borough {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
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
    color: #ff4757;
  }

  .area-stat-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
  }

  .area-description {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.5;
    margin: 0;
  }

  /* Proposal cards */
  .proposals-summary {
    display: flex;
    gap: 24px;
    justify-content: center;
    margin: 24px 0;
    padding: 16px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 10px;
  }

  .summary-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .summary-value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .summary-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
  }

  .line-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .line-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
    color: inherit;
    font: inherit;
  }

  .line-card:hover {
    background: rgba(255, 255, 255, 0.07);
  }

  .line-card.selected {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
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
  }

  .line-status {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-planned {
    color: #2ed573;
  }
  .status-proposed {
    color: #ffa502;
  }
  .status-advocacy {
    color: #a4b0be;
  }
  .status-under_construction {
    color: #1e90ff;
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
    color: #2ed573;
  }

  .score-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.35);
  }

  .line-detail {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .line-detail p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
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
  }

  .ls-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
  }

  .neighborhoods {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .neighborhood-tag {
    font-size: 11px;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.55);
  }

  /* Cost comparison chart */
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
  }

  .cost-city {
    display: block;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
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
  }

  /* Cost factors */
  .cost-factors {
    margin-bottom: 32px;
  }

  .cost-factors h3 {
    font-size: 1.2rem;
    margin: 0 0 16px;
  }

  .factor-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 12px;
  }

  .factor-card {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 10px;
    padding: 16px;
  }

  .factor-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 6px;
    color: #ff4757;
  }

  .factor-card p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.5;
    margin: 0;
  }

  /* What-if section */
  .what-if {
    background: rgba(46, 213, 115, 0.08);
    border: 1px solid rgba(46, 213, 115, 0.2);
    border-radius: 12px;
    padding: 24px;
  }

  .what-if h3 {
    font-size: 1.2rem;
    margin: 0 0 12px;
    color: #2ed573;
  }

  .what-if p {
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 10px;
    color: rgba(255, 255, 255, 0.7);
  }

  .what-if strong {
    color: white;
  }

  /* Footer */
  .exploration-footer {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .exploration-footer p {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
    line-height: 1.6;
  }

  @media (max-width: 640px) {
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

    .proposals-summary {
      flex-direction: column;
      gap: 12px;
    }

    .factor-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
