import { type ExperimentContent3D, type Post, PostType, type RendererParams } from '@sc/model';
import {
	AmbientLight,
	BoxGeometry,
	Color,
	DirectionalLight,
	Group,
	Mesh,
	MeshLambertMaterial,
	PerspectiveCamera,
	Scene,
	WebGLRenderer
} from 'three';
import { colorParam, numberParam, paramsById, type ContentParams } from '$lib/content-params';

// ─── Panel base dimensions ──────────────────────────────────────────────────

const BASE_WIDTH = 1.6;
const BASE_HEIGHT = 0.42;
const BASE_DEPTH = 0.32;

// ─── Build the grid ─────────────────────────────────────────────────────────

function buildGrid(
	cols: number,
	rows: number,
	spacingX: number,
	spacingY: number,
	curl: number,
	pitch: number,
	roll: number,
	columnOffset: number,
	slice: number,
	depth: number,
	panelHeight: number,
	panelWidth: number,
	mat: MeshLambertMaterial
): Group {
	const grid = new Group();

	const cellW = panelWidth + spacingX;
	const cellH = panelHeight + spacingY;

	const totalH = (rows - 1) * cellH;
	const centerCol = (cols - 1) / 2;
	const toRad = Math.PI / 180;

	// Curl arc setup
	const totalArcLen = (cols - 1) * cellW;
	const arcAngle = curl * Math.PI * 2;
	const useArc = Math.abs(curl) > 0.001;
	const radius = useArc ? totalArcLen / arcAngle : 0;

	const geo = new BoxGeometry(panelWidth, panelHeight, depth);
	const gap = spacingY;

	// Fixed column height — every column occupies exactly this span
	const colH = rows * panelHeight + (rows - 1) * gap;

	const colBottom = -colH / 2;
	const fullColTop = colH / 2;

	for (let c = 0; c < cols; c++) {
		const rawShift = c * columnOffset * cellH;
		const shift = ((rawShift % cellH) + cellH) % cellH;

		// Slice: diagonal cut line — rightmost column at full height,
		// each column to the left drops by slice * cellH.
		const distFromRight = cols - 1 - c;
		const sliceDrop = distFromRight * slice * cellH;
		const colTop = Math.max(colBottom, fullColTop - sliceDrop);

		const colT = cols > 1 ? (c - centerCol) / (cols - 1) : 0;
		const angle = useArc ? colT * arcAngle : 0;

		const s = shift < 0.001 ? 0 : ((shift % cellH) + cellH) % cellH;

		// Build panels clipped to [colBottom, colTop]
		const panels: { y: number; h: number }[] = [];

		for (let r = -1; r <= rows; r++) {
			const nominalBot = colBottom + s + r * cellH;
			const nominalTop = nominalBot + panelHeight;
			const clippedBot = Math.max(nominalBot, colBottom);
			const clippedTop = Math.min(nominalTop, colTop);
			const h = clippedTop - clippedBot;
			if (h <= 0.01) continue;
			panels.push({ y: clippedBot, h });
		}

		// Merge thin top panel into the one below
		if (panels.length >= 2) {
			const top = panels[panels.length - 1];
			if (top.h < panelHeight * 0.5) {
				const prev = panels[panels.length - 2];
				prev.h = top.y + top.h - prev.y;
				panels.pop();
			}
		}

		// Merge thin bottom panel into the one above
		if (panels.length >= 2) {
			const bot = panels[0];
			if (bot.h < panelHeight * 0.5) {
				const next = panels[1];
				const newTop = next.y + next.h;
				next.y = bot.y;
				next.h = newTop - bot.y;
				panels.shift();
			}
		}

		for (let i = 0; i < panels.length; i++) {
			const { y: panelY, h: finalH } = panels[i];

			if (finalH <= 0.01) continue;

			const useGeo =
				Math.abs(finalH - panelHeight) > 0.001 ? new BoxGeometry(panelWidth, finalH, depth) : geo;

			const mesh = new Mesh(useGeo, mat);
			const yPos = panelY + finalH / 2;

			if (useArc) {
				mesh.position.set(Math.sin(angle) * radius, yPos, -(radius * (1 - Math.cos(angle))));
				mesh.rotation.y = angle;
			} else {
				mesh.position.set((c - centerCol) * cellW, yPos, 0);
			}

			mesh.rotation.x += pitch * i * toRad;
			mesh.rotation.z += roll * i * toRad;
			grid.add(mesh);
		}
	}

	return grid;
}

// ─── Content class ──────────────────────────────────────────────────────────

const defaultCols = 20;
const defaultRows = 30;
const defaultSpacingX = 0.6;
const defaultSpacingY = 0.6;
const defaultCurl = 0;
const defaultPitch = 0;
const defaultRoll = 0;
const defaultOffset = 0;
const defaultSlice = 0;
const defaultDepth = 0.32;
const defaultPanelWidth = 1.6;
const defaultPanelHeight = 0.42;
const defaultFgColor = '#005aff';
const defaultBgColor = '#bcb456';
const defaultShadow = 0.06;
const defaultShadowColor = '#000000';

const params = [
	{
		...numberParam('Columns', defaultCols, { min: 1, max: 40, step: 1 })
	},
	{
		...numberParam('Rows', defaultRows, { min: 1, max: 50, step: 1 })
	},
	{
		...numberParam('Spacing X', defaultSpacingX, { min: 0.1, max: 3, step: 0.1 }),
		description: 'Horizontal gap between panels'
	},
	{
		...numberParam('Spacing Y', defaultSpacingY, { min: 0.1, max: 3, step: 0.1 }),
		description: 'Vertical gap between panels'
	},
	{
		...numberParam('Panel Width', defaultPanelWidth, { min: 0.3, max: 4, step: 0.1 }),
		description: 'Width of each panel'
	},
	{
		...numberParam('Panel Height', defaultPanelHeight, { min: 0.1, max: 2, step: 0.05 }),
		description: 'Height of each panel'
	},
	{
		...numberParam('Depth', defaultDepth, { min: 0.1, max: 2, step: 0.05 }),
		description: 'Thickness of each panel'
	},
	{
		...numberParam('Curl', defaultCurl, { min: 0, max: 1, step: 0.01 }),
		description: '0 = flat, 1 = full circle — bends all columns along an arc'
	},
	{
		...numberParam('Slice', defaultSlice, { min: 0, max: 2, step: 0.05 }),
		description: 'Taper diagonally from the right — 1 = lose one panel per column'
	},
	{
		...numberParam('Column Offset', defaultOffset, { min: -5, max: 5, step: 0.05 }),
		description: 'Shift gap alignment per column — creates a diagonal brick pattern'
	},
	// {
	// 	...numberParam('Yaw', 0, { min: -3, max: 3, step: 0.05 }),
	// 	description: 'Left/right twist per row (degrees)'
	// },
	{
		...numberParam('Pitch', defaultPitch, { min: -3, max: 3, step: 0.05 }),
		description: 'Forward/back tilt per row (degrees)'
	},
	{
		...numberParam('Roll', defaultRoll, { min: -3, max: 3, step: 0.05 }),
		description: 'Clockwise/counter-clockwise spin per row (degrees)'
	},
	colorParam('Foreground', defaultFgColor),
	colorParam('Background', defaultBgColor),
	{
		...numberParam('Shadow', defaultShadow, { min: 0, max: 0.5, step: 0.01 }),
		description: 'Intensity of the directional light shadow'
	},
	colorParam('Shadow Color', defaultShadowColor)
];

const ID = {
	cols: 'columns',
	rows: 'rows',
	spacingX: 'spacing-x',
	spacingY: 'spacing-y',
	panelWidth: 'panel-width',
	panelHeight: 'panel-height',
	depth: 'depth',
	curl: 'curl',
	slice: 'slice',
	offset: 'column-offset',
	pitch: 'pitch',
	roll: 'roll',
	fg: 'foreground',
	bg: 'background',
	shadow: 'shadow',
	shadowColor: 'shadow-color'
} as const;

export function readParams(values: ContentParams) {
	const p = paramsById(values);
	return {
		cols: (p[ID.cols]?.value as number) ?? defaultCols,
		rows: (p[ID.rows]?.value as number) ?? defaultRows,
		spacingX: (p[ID.spacingX]?.value as number) ?? defaultSpacingX,
		spacingY: (p[ID.spacingY]?.value as number) ?? defaultSpacingY,
		panelWidth: (p[ID.panelWidth]?.value as number) ?? defaultPanelWidth,
		panelHeight: (p[ID.panelHeight]?.value as number) ?? defaultPanelHeight,
		depth: (p[ID.depth]?.value as number) ?? defaultDepth,
		curl: (p[ID.curl]?.value as number) ?? defaultCurl,
		slice: (p[ID.slice]?.value as number) ?? defaultSlice,
		pitch: (p[ID.pitch]?.value as number) ?? defaultPitch,
		roll: (p[ID.roll]?.value as number) ?? defaultRoll,
		columnOffset: (p[ID.offset]?.value as number) ?? defaultOffset,
		fgColor: (p[ID.fg]?.value as string) ?? defaultFgColor,
		bgColor: (p[ID.bg]?.value as string) ?? defaultBgColor,
		shadow: (p[ID.shadow]?.value as number) ?? defaultShadow,
		shadowColor: (p[ID.shadowColor]?.value as string) ?? defaultShadowColor
	};
}

class BarclaysPanelContent implements ExperimentContent3D {
	private scene: Scene | undefined;
	private camera: PerspectiveCamera | undefined;
	private renderer: WebGLRenderer | undefined;
	private gridGroup: Group | undefined;
	private mat: MeshLambertMaterial | undefined;
	private dirLight: DirectionalLight | undefined;
	private ambientLight: AmbientLight | undefined;

	private cols = defaultCols;
	private rows = defaultRows;
	private spacingX = defaultSpacingX;
	private spacingY = defaultSpacingY;
	private panelWidth = defaultPanelWidth;
	private panelHeight = defaultPanelHeight;
	private depth = defaultDepth;
	private curl = defaultCurl;
	private slice = defaultSlice;
	private pitch = defaultPitch;
	private roll = defaultRoll;
	private columnOffset = defaultOffset;
	private fgColor = defaultFgColor;
	private bgColor = defaultBgColor;
	private shadow = defaultShadow;
	private shadowColor = defaultShadowColor;

	start = ({ scene, camera, renderer, container }: RendererParams) => {
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;

		scene.background = new Color(0xbcb456);
		this.mat = new MeshLambertMaterial({ color: new Color(0x005aff) });

		this.ambientLight = new AmbientLight(0xffffff, 1 - this.shadow);
		scene.add(this.ambientLight);
		this.dirLight = new DirectionalLight(new Color(this.shadowColor), this.shadow);
		this.dirLight.position.set(3, 5, 8);
		scene.add(this.dirLight);

		const cellW = this.panelWidth + this.spacingX;
		const gridW = this.cols * cellW;
		const fovRad = (camera.fov / 2) * (Math.PI / 180);
		const dist = (gridW / 2 / Math.tan(fovRad)) * 1.1;
		camera.position.set(0, 0, dist);
		camera.lookAt(0, 0, 0);
		camera.near = 0.1;
		camera.far = dist * 5;
		camera.updateProjectionMatrix();

		this.rebuildGrid();
	};

	private rebuildGrid() {
		if (!this.scene || !this.mat) return;

		if (this.gridGroup) {
			this.scene.remove(this.gridGroup);
		}

		this.gridGroup = buildGrid(
			this.cols,
			this.rows,
			this.spacingX,
			this.spacingY,
			this.curl,
			this.pitch,
			this.roll,
			this.columnOffset,
			this.slice,
			this.depth,
			this.panelHeight,
			this.panelWidth,
			this.mat
		);
		this.scene.add(this.gridGroup);
	}

	setParams = (values: ContentParams) => {
		const v = readParams(values);
		this.cols = v.cols;
		this.rows = v.rows;
		this.spacingX = v.spacingX;
		this.spacingY = v.spacingY;
		this.panelWidth = v.panelWidth;
		this.panelHeight = v.panelHeight;
		this.depth = v.depth;
		this.curl = v.curl;
		this.slice = v.slice;
		this.pitch = v.pitch;
		this.roll = v.roll;
		this.columnOffset = v.columnOffset;
		this.fgColor = v.fgColor;
		this.bgColor = v.bgColor;

		this.shadow = v.shadow;
		this.shadowColor = v.shadowColor;

		if (this.mat) this.mat.color.set(this.fgColor);
		if (this.scene) this.scene.background = new Color(this.bgColor);
		if (this.dirLight) {
			this.dirLight.intensity = this.shadow;
			this.dirLight.color.set(this.shadowColor);
		}
		if (this.ambientLight) {
			this.ambientLight.intensity = 1 - this.shadow;
		}

		this.rebuildGrid();
	};

	onRender = () => {};

	stop = () => {};
}

// ─── Post export ────────────────────────────────────────────────────────────

const post: Post = {
	summary: {
		id: 'barclays-panel',
		tags: ['3d', 'architecture', 'shader'],
		title: 'Barclays Panel',
		timestamp: new Date(2026, 3, 27),
		type: PostType.experiment3d
	},
	params,
	content: () => new BarclaysPanelContent()
};

export default post;
