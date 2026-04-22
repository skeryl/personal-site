import { type Post, PostType, type StageContent } from '@sc/model';
import { type Stage } from 'grraf';
import {
	type ContentParams,
	numberParam,
	colorParam,
	selectParam,
	paramsById,
	ParamType,
	type ContentParam
} from '$lib/content-params';

import gapRects from '$lib/data/moire-gap-data';

const DEFAULT_FG = '#ffffff';
const DEFAULT_BG = '#000000';

class MoirePatternContent implements StageContent {
	private stage: Stage | undefined;
	private ctx: CanvasRenderingContext2D | undefined;
	private animationId: number | undefined;
	private isPlaying = false;

	// Mouse state (normalized 0–1)
	private mouseX = 0.5;
	private mouseY = 0.5;
	private targetMouseX = 0.5;
	private targetMouseY = 0.5;

	// Params
	private version = 'V7 — Matrix';
	// V7 Matrix params
	private cellW = 50;
	private cellH = 50;
	private cellMargin = 2;
	private xCoeff = 1;
	private yCoeff = 1;
	private xyCoeff = 0.5;
	private xExp = 2;
	private yExp = 2;
	private rotRange = 45;
	private colorShift = 180;
	private polyOffset = 0.5;
	private minSize = 0.8;
	private varyWidth = 1;
	private varyHeight = 1;
	private varyRotation = 1;
	private varyColor = 0;
	private skyColor = DEFAULT_FG;
	private panelColor = DEFAULT_BG;
	private waveAmount = 0.35;
	private finCount = 40;
	private layerGap = 0.5;
	private time = 0;

	// Handlers (stored for cleanup)
	private onMouseMove: ((e: MouseEvent) => void) | undefined;
	private onTouchMove: ((e: TouchEvent) => void) | undefined;

	start(stage: Stage): void {
		this.stage = stage;
		this.ctx = stage.canvas.getContext('2d')!;
		this.isPlaying = true;

		// Track mouse/touch position
		const canvas = stage.canvas;
		this.onMouseMove = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			this.targetMouseX = (e.clientX - rect.left) / rect.width;
			this.targetMouseY = (e.clientY - rect.top) / rect.height;
		};
		this.onTouchMove = (e: TouchEvent) => {
			const rect = canvas.getBoundingClientRect();
			const t = e.touches[0];
			this.targetMouseX = (t.clientX - rect.left) / rect.width;
			this.targetMouseY = (t.clientY - rect.top) / rect.height;
		};
		canvas.addEventListener('mousemove', this.onMouseMove);
		canvas.addEventListener('touchmove', this.onTouchMove, { passive: true });

		this.animate();
	}

	unpause(): void {
		if (!this.isPlaying) {
			this.isPlaying = true;
			this.animate();
		}
	}

	stop(): void {
		this.isPlaying = false;
		if (this.animationId !== undefined) {
			cancelAnimationFrame(this.animationId);
			this.animationId = undefined;
		}
		if (this.stage?.canvas) {
			if (this.onMouseMove) this.stage.canvas.removeEventListener('mousemove', this.onMouseMove);
			if (this.onTouchMove) this.stage.canvas.removeEventListener('touchmove', this.onTouchMove);
		}
	}

	setParams(params: ContentParams): void {
		const byId = paramsById(params);
		const num = (id: string) => (byId[id] as ContentParam<ParamType.number>)?.value;
		const col = (id: string) => (byId[id] as ContentParam<ParamType.color>)?.value as string;

		const str = (id: string) => byId[id]?.value as string | undefined;
		if (str('version')) this.version = str('version')!;
		if (col('foreground')) this.skyColor = col('foreground');
		if (col('background')) this.panelColor = col('background');
		if (num('wave-amount') !== undefined) this.waveAmount = num('wave-amount');
		if (num('fin-count') !== undefined) this.finCount = num('fin-count');
		if (num('layer-gap') !== undefined) this.layerGap = num('layer-gap');
		// V7 params
		if (num('panel-width') !== undefined) this.cellW = num('panel-width');
		if (num('panel-height') !== undefined) this.cellH = num('panel-height');
		if (num('panel-rotation') !== undefined) this.rotRange = num('panel-rotation');
		if (num('panel-margin') !== undefined) this.cellMargin = num('panel-margin');
	}

	private animate = (): void => {
		if (!this.isPlaying || !this.ctx || !this.stage) return;

		// Smooth mouse following
		this.mouseX += (this.targetMouseX - this.mouseX) * 0.08;
		this.mouseY += (this.targetMouseY - this.mouseY) * 0.08;

		this.time += 0.003;

		const canvas = this.stage.canvas;
		const ctx = this.ctx;
		const w = canvas.width;
		const h = canvas.height;

		const viewAngle = (this.mouseX - 0.5) * 2; // -1 to 1

		if (this.version === 'V7 — Matrix') {
			this.drawMatrix(ctx, w, h);
		} else if (this.version === 'V3 — Facade') {
			ctx.fillStyle = this.skyColor;
			ctx.fillRect(0, 0, w, h);
			this.drawFacadeLayer(ctx, w, h, viewAngle, 1.0, 0);
		} else if (this.version === 'V4 — Gaps') {
			ctx.fillStyle = this.panelColor;
			ctx.fillRect(0, 0, w, h);
			this.drawGaps(ctx, w, h, viewAngle);
		} else if (this.version === 'V6 — Parallelograms') {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, w, h);
			this.drawParallelograms(ctx, w, h);
		} else if (this.version === 'V5 — Traced') {
			// Static trace of actual Barclays Center gap pattern
			ctx.fillStyle = this.panelColor;
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = '#1a0e08';
			for (const [cx, cy, rw, rh] of gapRects) {
				ctx.fillRect(cx * w - (rw * w) / 2, cy * h - (rh * h) / 2, rw * w, rh * h);
			}
		} else {
			// V1/V2: normal sky fill first
			ctx.fillStyle = this.skyColor;
			ctx.fillRect(0, 0, w, h);
			if (this.version === 'V2 — Panels') {
				this.drawPanelLayer(ctx, w, h, viewAngle * 0.3, 0.75, 0);
				this.drawPanelLayer(ctx, w, h, viewAngle * -0.3, 1.0, 1);
			} else {
				this.drawWaveLayer(ctx, w, h, viewAngle * 0.3, 0.7);
				this.drawWaveLayer(ctx, w, h, viewAngle * -0.3, 1.0);
			}
		}

		this.animationId = requestAnimationFrame(this.animate);
	};

	private drawWaveLayer(
		ctx: CanvasRenderingContext2D,
		w: number,
		h: number,
		shift: number,
		opacity: number
	): void {
		const count = Math.round(this.finCount);
		const finSpacing = w / count;
		const finWidth = finSpacing * 0.65;
		const segments = 80;
		const segH = h / segments;

		ctx.save();
		ctx.globalAlpha = opacity;

		for (let i = -2; i < count + 2; i++) {
			const baseX = i * finSpacing + finSpacing / 2;
			const parallaxShift = shift * finSpacing * this.layerGap * 3;

			ctx.beginPath();
			for (let s = 0; s <= segments; s++) {
				const y = s * segH;
				const yNorm = s / segments;
				const wave1 = Math.sin(yNorm * Math.PI * 4 + this.time * 2 + i * 0.3) * this.waveAmount;
				const wave2 =
					Math.sin(yNorm * Math.PI * 7 + this.time * 1.3 + i * 0.7) * this.waveAmount * 0.3;
				const xOffset = (wave1 + wave2) * finSpacing + parallaxShift;
				const x = baseX + xOffset - finWidth / 2;
				if (s === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			for (let s = segments; s >= 0; s--) {
				const y = s * segH;
				const yNorm = s / segments;
				const wave1 = Math.sin(yNorm * Math.PI * 4 + this.time * 2 + i * 0.3) * this.waveAmount;
				const wave2 =
					Math.sin(yNorm * Math.PI * 7 + this.time * 1.3 + i * 0.7) * this.waveAmount * 0.3;
				const xOffset = (wave1 + wave2) * finSpacing + parallaxShift;
				const x = baseX + xOffset + finWidth / 2;
				ctx.lineTo(x, y);
			}
			ctx.closePath();
			ctx.fillStyle = this.panelColor;
			ctx.fill();
		}

		ctx.restore();
	}

	private drawPanelLayer(
		ctx: CanvasRenderingContext2D,
		w: number,
		h: number,
		shift: number,
		opacity: number,
		layerSeed: number
	): void {
		const cols = Math.round(this.finCount);
		const colW = w / cols;
		const panelW = colW * 0.6;
		// Panel heights vary — use a base height with seeded variation
		const basePanelH = colW * 1.8;
		const gapV = colW * 0.15; // vertical gap between panels

		ctx.save();
		ctx.globalAlpha = opacity;
		ctx.fillStyle = this.panelColor;

		const parallaxShift = shift * colW * this.layerGap * 3;

		for (let col = -2; col < cols + 2; col++) {
			const baseX = col * colW + colW / 2 + parallaxShift;

			// Stack panels vertically in this column
			let y = -basePanelH * 0.5; // start slightly above viewport
			let panelIndex = 0;

			while (y < h + basePanelH) {
				// Vary panel height using a deterministic hash
				const seed = col * 137 + panelIndex * 59 + layerSeed * 311;
				const heightVar = 0.6 + ((((seed * 2654435761) >>> 0) % 1000) / 1000) * 0.8;
				const pH = basePanelH * heightVar;

				// Wave offset — each panel shifts horizontally based on its
				// position, creating the undulating pattern
				const yCenter = y + pH / 2;
				const yNorm = yCenter / h;
				const wave1 = Math.sin(yNorm * Math.PI * 4 + this.time * 2 + col * 0.3) * this.waveAmount;
				const wave2 =
					Math.sin(yNorm * Math.PI * 7 + this.time * 1.3 + col * 0.7) * this.waveAmount * 0.3;
				const xOffset = (wave1 + wave2) * colW;

				const px = baseX + xOffset - panelW / 2;
				const py = y;

				// Only draw if visible
				if (py + pH > 0 && py < h) {
					ctx.fillRect(px, py, panelW, pH);
				}

				y += pH + gapV;
				panelIndex++;
			}
		}

		ctx.restore();
	}

	// Deterministic hash for consistent panel variation
	private hash(a: number, b: number): number {
		const seed = a * 137 + b * 311;
		return ((seed * 2654435761) >>> 0) / 4294967296; // 0–1
	}

	private drawFacadeLayer(
		ctx: CanvasRenderingContext2D,
		w: number,
		h: number,
		viewAngle: number,
		opacity: number,
		depthOffset: number
	): void {
		// Based on Barclays Center facade by SHoP Architects:
		// - 950 mega-panels, each ~5' wide, 10–40' tall (2:1 to 8:1 ratio)
		// - 12,000 individual sub-panels, no two alike
		// - Lattice depth varies 18" to 5' across the facade
		// - Panel spacing is intentionally non-uniform

		const cols = Math.round(this.finCount);
		const colW = w / cols;
		const panelMaxW = colW * 0.82;
		const baseUnitH = colW * 0.9; // base unit for panel height calculation
		const gapH = colW * 0.06; // horizontal gap (glass band)

		// Arc span: how much of the cylinder is visible
		const arcSpan = Math.PI * 0.6;
		const viewer = viewAngle * arcSpan * 0.4;
		// Depth offset varies across facade (18" to 5' in real building)
		const depthShift = depthOffset * 0.15;

		// Parse panel color once
		const pr = parseInt(this.panelColor.slice(1, 3), 16);
		const pg = parseInt(this.panelColor.slice(3, 5), 16);
		const pb = parseInt(this.panelColor.slice(5, 7), 16);

		ctx.save();
		ctx.globalAlpha = opacity;

		for (let c = 0; c < cols; c++) {
			// Panel's fixed angle on the cylinder
			const panelAngle = ((c + 0.5) / cols - 0.5) * arcSpan;
			const relAngle = panelAngle - viewer + depthShift;
			const cosA = Math.cos(relAngle);

			if (cosA <= 0.02) continue;

			const apparentW = panelMaxW * cosA;

			// Project cylinder onto screen — sin(angle) maps curved surface
			// to flat screen, compressing panels toward the edges
			const halfArc = Math.sin(arcSpan / 2);
			const screenX = w / 2 + (Math.sin(panelAngle) / halfArc) * (w / 2);

			// Depth varies across facade (more moiré toward edges)
			const edgeFactor = Math.abs(c / cols - 0.5) * 2; // 0 at center, 1 at edges
			const localDepth = 1 + edgeFactor * 0.5;

			let y = -baseUnitH;
			let panelIdx = 0;

			while (y < h + baseUnitH) {
				// Panel height: 2–8x the base unit, deterministic per position
				const hRand = this.hash(c + depthOffset * 100, panelIdx);
				const heightMultiplier = 2 + hRand * 6; // 2x to 8x
				const panelH = baseUnitH * heightMultiplier;

				// Gap between panels varies (non-uniform, like the real building)
				const gapRand = this.hash(c + depthOffset * 100, panelIdx + 1000);
				const gapV = baseUnitH * (0.08 + gapRand * 0.15);

				const yCenter = y + panelH / 2;

				// Subtle fixed wave offset for organic feel
				const waveOff =
					Math.sin((yCenter / h) * Math.PI * 3 + c * 0.5) * this.waveAmount * colW * 0.2;

				// Shade based on viewing angle + variation per panel
				const panelShadeVar = 0.9 + this.hash(c, panelIdx + 500) * 0.2;
				const shade = Math.max(0.25, cosA * panelShadeVar);

				if (y + panelH > 0 && y < h) {
					ctx.fillStyle = `rgb(${Math.round(pr * shade)}, ${Math.round(pg * shade)}, ${Math.round(pb * shade)})`;
					ctx.fillRect(screenX - apparentW / 2 + waveOff, y, apparentW, panelH);
				}

				y += panelH + gapV;
				panelIdx++;
			}
		}

		ctx.restore();
	}

	private drawGaps(ctx: CanvasRenderingContext2D, w: number, h: number, viewAngle: number): void {
		// Gaps driven by a single dome shape — not repeating patterns.
		// Gap size = how far each point is from the dome's "face-on" center.
		// Rows curve to follow the dome's contour lines.

		const cols = Math.round(this.finCount);
		const gapSpacingX = w / cols;
		const rowH = gapSpacingX * 0.55;
		const rows = Math.ceil(h / rowH) + 2;

		const maxGapW = gapSpacingX * 0.4;
		const gapH = rowH * 0.28;

		// Dome center: mouse controls where you're looking "face-on"
		const domeCX = this.mouseX * w;
		const domeCY = this.mouseY * h;
		// Dome radius — determines how far the gradient spreads
		const domeR = Math.max(w, h) * 0.7;

		ctx.fillStyle = '#1a0e08';

		for (let r = -1; r < rows; r++) {
			const stagger = (r % 2) * gapSpacingX * 0.5;

			for (let c = -1; c < cols + 2; c++) {
				const baseX = c * gapSpacingX + stagger;

				// Curve the row: Y bends along dome contour.
				// Rows arc upward near the dome center, flatter at edges.
				const dxFromCenter = (baseX - domeCX) / domeR;
				const rowCurve = Math.sqrt(Math.max(0, 1 - dxFromCenter * dxFromCenter));
				const curvedY = r * rowH - rowCurve * rowH * 2 * this.waveAmount;

				// Distance from dome center (normalized 0–1)
				const dx = (baseX - domeCX) / domeR;
				const dy = (curvedY - domeCY) / domeR;
				const dist = Math.sqrt(dx * dx + dy * dy);

				// Gap size: small at center (face-on), large toward edges (oblique)
				// Smooth ramp, not periodic
				const openness = Math.min(1, dist * 1.2);
				const gapW = maxGapW * openness * this.layerGap * 2;

				if (gapW < 0.5) continue;

				// Slight per-gap variation for organic feel (deterministic)
				const jitterX = this.hash(c + 500, r) * gapSpacingX * 0.08 - gapSpacingX * 0.04;
				const jitterY = this.hash(c, r + 500) * rowH * 0.1 - rowH * 0.05;

				ctx.fillRect(baseX - gapW / 2 + jitterX, curvedY + (rowH - gapH) / 2 + jitterY, gapW, gapH);
			}
		}
	}

	private drawParallelograms(ctx: CanvasRenderingContext2D, w: number, h: number): void {
		// Static layout: rows of black parallelogram panels on white,
		// staggered like the Barclays Center facade from a side angle.

		// Each row: a horizontal band of parallelogram panels.
		// Panels tilt upward-right (top edge shifted right of bottom).
		// Adjacent panels touch: bottom-right of one = top-left of next.
		// Rows are separated by generous white space.

		// Columns of animated parallelograms.
		// Same panel shape as reference (wide, tilted upward-right).
		// Organized by columns — each column cascades independently.
		// When a panel grows, panels below it in that column shift down.
		const baseH = 14;
		const panelW = baseH * 5;
		const tiltAngle = (7 * Math.PI) / 180;
		const tiltY = panelW * Math.tan(tiltAngle);

		// Column layout: spacing matches corner-to-corner geometry.
		// At base height, BR of col C panel = TL of col C+1 panel.
		// colSpacing = panelW (panels side by side horizontally)
		// colStagger = baseH - tiltY (vertical step for corner touching)
		const colSpacing = panelW;
		const totalCols = Math.ceil(w / colSpacing) + 3;
		// Vertical gap between panels within a column — generous for breathing room
		const gapY = baseH * 6;
		const panelsPerCol = Math.ceil(h / (baseH + gapY)) + 3;

		// Each column shifts down by the corner-touching step
		const colStagger = baseH - tiltY;

		// Ocean wave easing
		const waveEase = (t: number): number => {
			const s = Math.sin(t);
			return s > 0 ? Math.pow(s, 0.7) : -Math.pow(-s, 1.4);
		};

		ctx.fillStyle = '#000000';

		// Compute all panel heights first
		const heights: number[][] = [];
		for (let col = 0; col < totalCols; col++) {
			heights[col] = [];
			for (let r = 0; r < panelsPerCol; r++) {
				const phase = this.hash(col * 71 + r * 100, r * 37 + col * 7) * Math.PI * 2;
				const speed = 0.6 + this.hash(col * 13 + r, r * 51 + col * 3) * 0.8;
				const wave = waveEase(this.time * speed + phase);
				heights[col][r] = baseH + (wave * 0.5 + 0.5) * baseH * 1.2;
			}
		}

		// Draw each horizontal row by walking left-to-right (corner-to-corner).
		// Vertical position of each row is fixed.
		for (let r = -2; r < panelsPerCol; r++) {
			const rowIdx = r + 2; // index into heights array

			// Walk the chain left to right
			let chainX = -panelW * 2;
			let chainY = r * (baseH + gapY);

			for (let col = -2; col < totalCols; col++) {
				const colIdx = Math.max(0, Math.min(col + 2, totalCols - 1));
				const rIdx = Math.max(0, Math.min(rowIdx, panelsPerCol - 1));
				const panelH = heights[colIdx]?.[rIdx] ?? baseH;

				const x = chainX;
				const y = chainY;

				ctx.beginPath();
				ctx.moveTo(x, y + panelH); // bottom-left
				ctx.lineTo(x + panelW, y + panelH - tiltY); // bottom-right
				ctx.lineTo(x + panelW, y - tiltY); // top-right
				ctx.lineTo(x, y); // top-left
				ctx.closePath();
				ctx.fill();

				// Next panel's TL = this panel's BR (corner-to-corner)
				chainX = x + panelW;
				chainY = y + panelH - tiltY;
			}
		}
	}

	private drawMatrix(ctx: CanvasRenderingContext2D, w: number, h: number): void {
		const panelW = this.cellW;
		const panelH = this.cellH;
		const margin = this.cellMargin;
		const stepX = panelW + margin;
		const stepY = panelH + margin;

		const cols = Math.ceil(w / stepX) + 2;
		const rows = Math.ceil(h / stepY) + 2;

		const rotation = this.rotRange * (Math.PI / 180);

		ctx.fillStyle = this.panelColor;
		ctx.fillRect(0, 0, w, h);

		ctx.fillStyle = this.skyColor;

		// Mouse position in pixels
		const mousePixelX = this.mouseX * w;
		const mousePixelY = this.mouseY * h;
		// Opposite point
		const oppX = w - mousePixelX;
		const oppY = h - mousePixelY;
		// Max distance (corner to corner) for normalization
		const maxDist = Math.sqrt(w * w + h * h);

		for (let r = -1; r < rows; r++) {
			for (let c = -1; c < cols; c++) {
				const cx = c * stepX + panelW / 2;
				const cy = r * stepY + panelH / 2;

				// Distance from mouse (0 = at mouse, 1 = furthest)
				const dx = cx - mousePixelX;
				const dy = cy - mousePixelY;
				const distMouse = Math.sqrt(dx * dx + dy * dy) / maxDist;

				// Width: shrink near mouse, grow on opposite side
				const factor = distMouse * 2 - 1;
				const widthScale = 1 + factor * 0.7;
				const adjustedW = panelW * Math.max(0.05, widthScale);

				const totalRot = rotation;

				ctx.save();
				ctx.translate(cx, cy);
				ctx.rotate(totalRot);
				ctx.fillRect(-adjustedW / 2, -panelH / 2, adjustedW, panelH);
				ctx.restore();
			}
		}
	}
}

const params = [
	{
		...selectParam(
			'Version',
			[
				'V1 — Waves',
				'V2 — Panels',
				'V3 — Facade',
				'V4 — Gaps',
				'V5 — Traced',
				'V6 — Parallelograms',
				'V7 — Matrix'
			],
			'V7 — Matrix'
		),
		group: 'Version',
		description: 'Switch between rendering approaches'
	},
	{
		...colorParam('Foreground', DEFAULT_FG),
		group: 'Color',
		description: 'Shape color (V7) / sky color (V1–V6)'
	},
	{
		...colorParam('Background', DEFAULT_BG),
		group: 'Color',
		description: 'Background color (V7) / panel color (V1–V6)'
	},
	{
		...numberParam('Wave Amount', 0.35, { min: 0, max: 1, step: 0.01 }),
		group: 'Pattern',
		description: 'How much the panels undulate — higher values create more dramatic curves'
	},
	{
		...numberParam('Fin Count', 40, { min: 10, max: 80, step: 1 }),
		group: 'Pattern',
		description: 'Number of vertical panels across the screen'
	},
	{
		...numberParam('Layer Gap', 0.5, { min: 0.1, max: 1.5, step: 0.05 }),
		group: 'Pattern',
		description: 'Depth between front and back layers — controls moiré intensity'
	},
	// V7 — Panel params
	{
		...numberParam('Panel Width', 50, { min: 5, max: 200, step: 1 }),
		group: 'Panels',
		description: 'Width of each panel'
	},
	{
		...numberParam('Panel Height', 50, { min: 5, max: 200, step: 1 }),
		group: 'Panels',
		description: 'Height of each panel'
	},
	{
		...numberParam('Panel Rotation', 0, { min: 0, max: 180, step: 1 }),
		group: 'Panels',
		description: 'Rotation of each panel in degrees'
	},
	{
		...numberParam('Panel Margin', 2, { min: 0, max: 50, step: 1 }),
		group: 'Panels',
		description: 'Gap between panels on all sides'
	}
];

const post: Post = {
	summary: {
		id: 'moire-pattern',
		tags: ['animation', 'canvas'],
		title: 'Moire Pattern',
		timestamp: new Date(2026, 3, 21),
		type: PostType.experiment,
		isHidden: false,
		collaborators: [{ name: 'Eva Warren', role: 'Art Direction', url: 'https://evamarie.studio' }]
	},
	content: () => new MoirePatternContent(),
	params
};

export default post;
