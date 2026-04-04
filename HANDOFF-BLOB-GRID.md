# Blob Grid - Handoff Document

## What is this?

A new "entry" for Shane's personal site: a 3x5 grid of soft-body blobs that bounce around inside their cells like a lava lamp. Sized for Instagram Reels (1080x1920, 9:16). Based on Eva's blob reference image.

## Files

| File | Purpose |
|------|---------|
| `packages/ui/src/lib/explorations/blob-grid.svelte` | Main Svelte component — all rendering and physics |
| `packages/ui/src/lib/entries/blob-grid.ts` | Entry definition (registers it with the site) |
| `packages/ui/src/lib/entries/index.ts` | Auto-generated index (Vite plugin regenerates this on dev server start) |

## How to run

```bash
# From repo root
npm install
npm run dev  # or however the dev server starts
# Navigate to the blob-grid entry
```

The entry is registered with id `blob-grid`, type `PostType.exploration`.

## Current state

The animation works and has a real-time params panel (top-right "Params" button) with sliders for:

- **Speed** (0.05 - 2.0) — blob movement velocity
- **Stiffness** (0.0005 - 0.1) — shape spring pulling blob back to its rest ellipse
- **Pressure** (0 - 0.9) — outward force from center (puffiness)
- **Damping** (0.8 - 0.99) — how quickly deformation oscillations settle

## How the physics works

Each blob is a **ring of 32 points** around a center. The center moves at constant speed and bounces off walls.

### Per-frame update order:
1. **Wall reaction** — ring points touching cell walls push the center away (reactive bounce, no fixed padding)
2. **Constant speed** — velocity magnitude is re-normalized after wall reaction
3. **Move center** — translate by velocity
4. **Spring forces** — each ring point is pulled toward its rest position (ellipse shape around center). Shape spring is **weakened when the blob is compressed** (area deficit) so it doesn't fight the squish
5. **Neighbor springs** — adjacent ring points pull toward rest spacing
6. **Pressure** — radial outward force from center
7. **Damping** — deformation velocity is multiplied by damping factor
8. **Wall clamp** — ring points are clamped to cell boundaries
9. **Area conservation** — if polygon area < rest area, **free points** (not touching walls) are scaled outward. Wall-touching points are skipped so all expansion goes to the bulge. Runs 4 iterations per frame at 0.5 easing for fast convergence. Re-clamps after each iteration.

### Rendering:
- Each blob is clipped to its cell (no gradient bleed)
- Smooth closed curve through ring points via quadratic Bezier through midpoints
- Radial gradient centered on the **centroid** of the deformed shape (not the physics center)
- Gradient radius adapts to actual shape extent
- Subtle shadow glow, also clipped to cell

## What still needs work

### Priority 1: More convincing squish
The blobs are getting *some* displacement when hitting walls, but it's still not dramatic enough. The flat wall-contact side looks more like "clipping" than "pressing." The bulge on the free side needs to be more pronounced. Ideas to explore:

- **Try more aggressive area conservation** — increase the 0.5 easing factor, add more iterations, or try direct offset injection instead of multiplicative scaling
- **Consider a fundamentally different approach** — instead of spring-mass with post-hoc area correction, try an **implicit surface / metaball approach** where the blob shape is defined by a field function that naturally deforms when constrained. Or try **position-based dynamics** where constraints (area, wall, shape) are solved simultaneously
- **The gradient still contributes to the "clip" look** — even though the shape deforms, the radial gradient creates a bright spot that gets cut flat at the wall. Consider a non-radial fill (e.g., solid color with soft edge blur, or a gradient that follows the deformed shape's aspect ratio)

### Priority 2: Blob aesthetics
- The blobs in Eva's reference image have a more painterly/watercolor quality — softer, more organic edges
- Consider adding subtle noise or wobble to the ring point positions for a less geometric feel
- The words in each cell (get, be, what, here, &, otherwise, from, how, words, here, do, could, ?, we, here) may want different positioning or styling

### Priority 3: Polish
- The params panel is functional but basic — might want to persist chosen values or remove the panel before shipping
- Consider adding an export/record mechanism for Instagram Reels output
- The grid border weight and background color may need adjustment to match the final aesthetic

## Architecture notes

- The entry system auto-generates `index.ts` via a Vite plugin (`packages/ui/plugins/post-summarizer.ts`) — just create the entry file and restart the dev server
- `PostType.exploration` entries return a Svelte component from their `content()` function
- The `Post` interface supports optional `params` for the site's built-in params panel, but that system is wired for `ExperimentContent3D` types, not Svelte components — that's why params are inline in the component

## Blob configuration

Each blob has a color (RGB tuple), a word, and an ellipse size. These are defined in `blobConfigs` in `blob-grid.svelte`:

```
Row 0: blue/"get", beige/"be", coral/"what"
Row 1: magenta/"here", yellow/"&", purple/"otherwise"
Row 2: gray/"from", blue/"how", olive/"words"
Row 3: brown/"here", pink/"do", teal/"could"
Row 4: dark brown/"?", green/"we", red/"here"
```

Colors and words can be freely changed in the `blobConfigs` array.
