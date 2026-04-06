# NYC Subway Expansion Exploration — Handoff

**Branch:** `claude/nyc-subway-expansion-vihVK`
**Date:** 2026-04-05
**Status:** Initial implementation complete, ready for local dev iteration

---

## What Was Built

A new exploration called **"The Subway Gap"** that analyzes NYC subway coverage gaps, identifies underserved neighborhoods, proposes expansion lines ranked by benefit-to-cost, and compares NYC construction costs to international benchmarks.

The exploration lives at `/journal/nyc-subway` and has four interactive sections:

1. **Overview** — System-wide stats (472 stations, 248 route miles, 4M daily riders) and borough-by-borough access breakdown with visual bar charts
2. **Underserved** — Interactive Leaflet map with 14 underserved neighborhoods as red circle markers (sized by population), plus detail cards with distance to nearest station, population, median income
3. **Proposals** — 9 proposed expansion lines plotted on the map, ranked by a composite benefit score. Click to expand detail cards with cost, ridership, neighborhoods served
4. **Costs** — Horizontal bar chart comparing NYC ($2.6B/mi avg) vs international ($0.5B/mi avg) construction costs, 6 cost driver explanations, and a "what if" scenario showing savings at international rates

### Interactive Map

Uses **Leaflet** (newly added dependency) with CARTO dark basemap tiles. Shows:
- Proposed lines as colored polylines (solid = planned, dashed = advocacy)
- Underserved areas as red circle markers
- Click interactions to select lines and zoom to their routes
- Popups with summary data

---

## File Structure

```
packages/ui/src/lib/
├── entries/
│   └── nyc-subway.ts                    # Post entry (registers at /journal/nyc-subway)
├── explorations/
│   ├── nyc-subway.svelte                # Thin wrapper component
│   └── nyc-subway/
│       ├── NycSubway.svelte             # Main exploration (4 tabbed sections, all UI/layout)
│       ├── SubwayMap.svelte             # Leaflet map component (dark tiles, line/marker layers)
│       └── data.ts                      # All data: stats, boroughs, underserved areas,
│                                        #   proposed lines, cost comparisons, helper functions
```

### Key Dependencies Added

- `leaflet` (^1.9.4) — map rendering
- `@types/leaflet` (^1.9.21) — TypeScript types

Leaflet CSS is loaded dynamically via a `<link>` element injected in `onMount` (see `SubwayMap.svelte`).

---

## Data Sources & Accuracy

Data was compiled from web research of:
- **MTA capital plans** and ridership reports
- **Regional Plan Association (RPA)** Fourth Regional Plan
- **Transit Costs Project** (NYU Marron Institute) for international cost comparisons
- **TransitCenter** and **Pratt Center** for equity/access analyses
- **Governor Hochul press releases** (SAS Phase 2 tunneling contract, IBX funding)

### Borough Access Rates (% within 0.5mi of station)
| Borough | Access | Source basis |
|---------|--------|-------------|
| Manhattan | 99% | StreetEasy/6sqft analysis |
| Brooklyn | 90% | |
| Bronx | 89% | |
| Queens | 61% | Worst of the boroughs with subway |
| Staten Island | 52% | SIR provides some coverage |

### Proposed Lines (9 total, ranked by benefit score)
| Line | Score | Cost | Status |
|------|-------|------|--------|
| IBX (Interborough Express) | 92 | $5.5B | Planned, first $2.75B funded |
| Utica Avenue | 88 | $8.0B | Advocacy |
| SAS Phase 3 | 85 | $8.0B | Proposed |
| Triboro Full Subway | 80 | $25.0B | Advocacy |
| SAS Phase 2 | 72 | $6.0B | Under construction (2032 target) |
| SAS Phase 4 | 70 | $6.5B | Proposed |
| SAS 125th Westward | 68 | $6.0B | Proposed (feasibility Jan 2026) |
| LaGuardia N/W Extension | 65 | $4.0B | Advocacy |
| Nostrand Ave Extension | 60 | $5.5B | Advocacy |

---

## Architecture Notes

### How Explorations Work
- **Entry file** (`entries/nyc-subway.ts`) exports a `Post` object with metadata + a content factory returning a Svelte component
- The **post-summarizer Vite plugin** (`packages/ui/plugins/post-summarizer.ts`) watches the entries directory and auto-generates:
  - `entries/index.ts` (exports map of all posts)
  - Route files at `routes/journal/[postId]/+page.svelte`
- Content type is `PostType.exploration`, which uses `ContentRendererExploration` to render the Svelte component directly
- No interactive params system used (unlike canvas/3D experiments)

### Leaflet Integration Pattern
- Leaflet is dynamically imported in `onMount` to avoid SSR issues
- CSS injected via DOM (`document.createElement('link')`) since there's no global CSS import path for Leaflet in this setup
- Map state managed via Svelte reactivity (`$:` blocks trigger redraws on selection changes)

### Pre-existing Build Issues
- `svelte-check` reports 285 errors across the whole codebase — these are **pre-existing** and caused by missing `.svelte-kit/tsconfig.json` (only generated when the dev server runs). None are from our new files specifically.

---

## What Needs Work / Ideas for Next Steps

### Must Do
- [ ] **Run locally** — `npm run dev` from `packages/ui/` and verify at `http://localhost:5173/journal/nyc-subway`
- [ ] **Test map loading** — Leaflet tiles require internet; verify the dark CARTO basemap loads properly
- [ ] **Mobile testing** — responsive styles are in place but untested on real devices

### Should Do
- [ ] **Record a video preview** — other explorations have `.webm`/`.mp4` previews in `assets/videos/posts/` for the PostList hover effect. Record one for `nyc-subway`
- [ ] **Refine benefit scores** — current scoring is editorial. Could make it formulaic: `(ridership / cost) * equity_weight`
- [ ] **Add demographic overlay** — income/race data per census tract on the map (would need GeoJSON data)
- [ ] **Improve map interactivity** — highlight connected underserved areas when a proposed line is selected

### Could Do
- [ ] **Add a "Build Your Own Line" tool** — let users draw routes and get rough cost/ridership estimates
- [ ] **Animate the cost comparison** — bar chart could animate in on scroll
- [ ] **Add the full SAS timeline** — from the 1929 IND plan through today, showing 100 years of delays
- [ ] **Station-level data** — import all 472 station locations as GeoJSON and show actual coverage radius circles
- [ ] **Bus route overlay** — show the B46 (Utica), Bx12, Q44 and other high-ridership bus routes that demonstrate latent subway demand
- [ ] **Compare to 1929 IND plan** — overlay the originally planned but never built lines (many of these proposals were in the original plan)

---

## How to Continue in a New Session

```bash
git fetch origin claude/nyc-subway-expansion-vihVK
git checkout claude/nyc-subway-expansion-vihVK
cd packages/ui
npm install
npm run dev
```

Then open `http://localhost:5173/journal/nyc-subway` to see the exploration.

All exploration code is in `packages/ui/src/lib/explorations/nyc-subway/`. The data module (`data.ts`) is the single source of truth for all statistics — modify it to add/update lines, neighborhoods, or costs.
