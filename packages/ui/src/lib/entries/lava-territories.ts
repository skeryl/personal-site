import { BookOfShadersContent } from '$lib/book-of-shaders';
import { PostType, type Post } from '@sc/model';
import {
	booleanParam,
	colorParam,
	numberParam,
	paramsById,
	type ContentParams
} from '$lib/content-params';
import type { IUniform } from '$lib/three';
import { Vector3, Vector4 } from 'three';

function hexToVec3(hex: string): Vector3 {
	return new Vector3(
		parseInt(hex.slice(1, 3), 16) / 255,
		parseInt(hex.slice(3, 5), 16) / 255,
		parseInt(hex.slice(5, 7), 16) / 255
	);
}

const defaultFlowSpeed = 1.0;
const defaultBoundaryWidth = 0.03;
const defaultDripIntensity = 2.4;
const defaultBoundaryColor = '#c898a2';

// Default zone colors as hex strings
const defaultColors = ['#ea85ad', '#5cb0f0', '#4e7358', '#ff3366'];
const defaultSizes = [0.44, 0.2, 0.16, 0.37];

const params = [
	{
		...numberParam('Flow Speed', defaultFlowSpeed, { min: 0.1, max: 3.0, step: 0.1 }),
		group: 'General',
		rangeLabels: ['slower', 'faster'] as [string, string]
	},
	{
		...numberParam('Drip Intensity', defaultDripIntensity, { min: 0.3, max: 6.0, step: 0.1 }),
		group: 'General',
		rangeLabels: ['less', 'more'] as [string, string]
	},
	{ ...colorParam('Boundary Color', defaultBoundaryColor), group: 'Boundary' },
	{
		...numberParam('Boundary Width', defaultBoundaryWidth, { min: 0.005, max: 0.1, step: 0.005 }),
		group: 'Boundary',
		rangeLabels: ['smaller', 'bigger'] as [string, string]
	},
	{ ...booleanParam('Zone 1 Visible', true), group: 'Zone 1' },
	{ ...colorParam('Zone 1 Color', defaultColors[0]), group: 'Zone 1' },
	{
		...numberParam('Zone 1 Size', defaultSizes[0], { min: 0.05, max: 0.7, step: 0.01 }),
		group: 'Zone 1',
		rangeLabels: ['smaller', 'bigger'] as [string, string]
	},
	{ ...booleanParam('Zone 2 Visible', true), group: 'Zone 2' },
	{ ...colorParam('Zone 2 Color', defaultColors[1]), group: 'Zone 2' },
	{
		...numberParam('Zone 2 Size', defaultSizes[1], { min: 0.05, max: 0.7, step: 0.01 }),
		group: 'Zone 2',
		rangeLabels: ['smaller', 'bigger'] as [string, string]
	},
	{ ...booleanParam('Zone 3 Visible', true), group: 'Zone 3' },
	{ ...colorParam('Zone 3 Color', defaultColors[2]), group: 'Zone 3' },
	{
		...numberParam('Zone 3 Size', defaultSizes[2], { min: 0.05, max: 0.7, step: 0.01 }),
		group: 'Zone 3',
		rangeLabels: ['smaller', 'bigger'] as [string, string]
	},
	{ ...booleanParam('Zone 4 Visible', true), group: 'Zone 4' },
	{ ...colorParam('Zone 4 Color', defaultColors[3]), group: 'Zone 4' },
	{
		...numberParam('Zone 4 Size', defaultSizes[3], { min: 0.05, max: 0.7, step: 0.01 }),
		group: 'Zone 4',
		rangeLabels: ['smaller', 'bigger'] as [string, string]
	}
];

function computeBreaks(s0: number, s1: number, s2: number, s3: number): Vector4 {
	const total = s0 + s1 + s2 + s3 || 1;
	return new Vector4(s0 / total, (s0 + s1) / total, (s0 + s1 + s2) / total, 1.0);
}

const fragmentShader = /* glsl */ `
precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_flowSpeed;
uniform float u_boundaryWidth;
uniform float u_dripIntensity;

uniform vec3 u_color0;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_boundaryColor;

// Cumulative zone breakpoints — allows each zone to be a different size.
// x = end of zone 0, y = end of zone 1, z = end of zone 2, w = 1.0
uniform vec4 u_breaks;

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
        v += a * noise(p);
        p = p * 2.1 + vec2(1.7, 9.2);
        a *= 0.5;
    }
    return v;
}

vec2 domainWarp(vec2 uv, float t) {
    vec2 c1 = vec2(uv.x * 2.4, uv.y * 0.45) + vec2(sin(t * 0.07) * 0.3, cos(t * 0.05) * 0.2);
    float wx1 = fbm(c1);
    float wy1 = fbm(c1 + vec2(3.1, 1.7));
    vec2 p1 = uv + vec2((wx1 - 0.5) * 0.18, (wy1 - 0.5) * u_dripIntensity);

    vec2 c2 = vec2(p1.x * 3.2, p1.y * 0.7) + vec2(sin(t * 0.06) * 0.25 + 1.9, cos(t * 0.04) * 0.2 + 3.4);
    float wx2 = fbm(c2);
    float wy2 = fbm(c2 + vec2(2.1, 0.8));
    return p1 + vec2((wx2 - 0.5) * 0.1, (wy2 - 0.5) * u_dripIntensity * 0.375);
}

vec3 getZoneColor(int idx) {
    if (idx == 0) return u_color0;
    if (idx == 1) return u_color1;
    if (idx == 2) return u_color2;
    return u_color3;
}

// Warm tint for internal gradient — shifts hue toward brighter/more saturated
vec3 computeTint(vec3 c) {
    return clamp(c + vec3(0.28, 0.07, -0.20), 0.0, 1.0);
}

vec3 computeBoundary(vec3 c) {
    return u_boundaryColor;
}

int prevZone(int idx) {
    if (idx == 0) return 3;
    if (idx == 1) return 0;
    if (idx == 2) return 1;
    return 2;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float t  = u_time * u_flowSpeed;

    vec2 warped = domainWarp(uv, t);

    vec2 fieldCoord = vec2(warped.x * 0.9, warped.y * 2.8 + t * 0.07);
    // 3-octave FBM tops out at ~0.875 — normalize so all 4 zones get equal area
    float field = clamp(fbm(fieldCoord) / 0.875, 0.0, 0.9999);

    // Variable-width zone membership from u_breaks
    int   zoneIdx;
    float zoneFrac;
    if (field < u_breaks.x) {
        zoneIdx  = 0;
        zoneFrac = field / u_breaks.x;
    } else if (field < u_breaks.y) {
        zoneIdx  = 1;
        zoneFrac = (field - u_breaks.x) / (u_breaks.y - u_breaks.x);
    } else if (field < u_breaks.z) {
        zoneIdx  = 2;
        zoneFrac = (field - u_breaks.y) / (u_breaks.z - u_breaks.y);
    } else {
        zoneIdx  = 3;
        zoneFrac = (field - u_breaks.z) / (1.0 - u_breaks.z);
    }

    // Internal gradient: large-scale noise tints each zone from its base toward its warm shift
    float tint = fbm(warped * 1.6 + vec2(13.7, 8.3) + t * 0.018);
    vec3 curBase  = getZoneColor(zoneIdx);
    vec3 prevBase = getZoneColor(prevZone(zoneIdx));
    vec3 currentColor = mix(curBase,  computeTint(curBase),  tint * 0.55);
    vec3 prevColor    = mix(prevBase, computeTint(prevBase), tint * 0.55);

    // Transition: smooth blend from previous zone into current over transWidth
    float transWidth = clamp(u_boundaryWidth * 14.0, 0.05, 0.55);
    float transT     = min(zoneFrac / transWidth, 1.0);
    vec3  color      = mix(prevColor, currentColor, smoothstep(0.0, 1.0, transT));

    // Soft boundary haze — peaks near the zone entry, derived from zone color
    float warmPeak = exp(-pow((transT - 0.35) * 3.8, 2.0));
    color = mix(color, computeBoundary(curBase), warmPeak * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
`;

class LavaTerritories extends BookOfShadersContent {
	constructor() {
		super();
		this.uniforms['u_flowSpeed'] = { value: defaultFlowSpeed } as unknown as IUniform;
		this.uniforms['u_boundaryWidth'] = { value: defaultBoundaryWidth } as unknown as IUniform;
		this.uniforms['u_dripIntensity'] = { value: defaultDripIntensity } as unknown as IUniform;
		this.uniforms['u_color0'] = { value: hexToVec3(defaultColors[0]) } as unknown as IUniform;
		this.uniforms['u_color1'] = { value: hexToVec3(defaultColors[1]) } as unknown as IUniform;
		this.uniforms['u_color2'] = { value: hexToVec3(defaultColors[2]) } as unknown as IUniform;
		this.uniforms['u_color3'] = { value: hexToVec3(defaultColors[3]) } as unknown as IUniform;
		this.uniforms['u_boundaryColor'] = {
			value: hexToVec3(defaultBoundaryColor)
		} as unknown as IUniform;
		this.uniforms['u_breaks'] = {
			value: computeBreaks(...(defaultSizes as [number, number, number, number]))
		} as unknown as IUniform;
	}

	getFragmentShader = () => fragmentShader;
	getParams = () => params;

	setParams = (values: ContentParams) => {
		const p = paramsById(values);

		const speed = p['flow-speed']?.value as number | undefined;
		const width = p['boundary-width']?.value as number | undefined;
		const drip = p['drip-intensity']?.value as number | undefined;
		if (speed !== undefined) this.uniforms['u_flowSpeed'].value = speed;
		if (width !== undefined) this.uniforms['u_boundaryWidth'].value = width;
		if (drip !== undefined) this.uniforms['u_dripIntensity'].value = drip;

		const c0 = p['zone-1-color']?.value as string | undefined;
		const c1 = p['zone-2-color']?.value as string | undefined;
		const c2 = p['zone-3-color']?.value as string | undefined;
		const c3 = p['zone-4-color']?.value as string | undefined;
		const bc = p['boundary-color']?.value as string | undefined;
		if (c0) this.uniforms['u_color0'].value = hexToVec3(c0);
		if (c1) this.uniforms['u_color1'].value = hexToVec3(c1);
		if (c2) this.uniforms['u_color2'].value = hexToVec3(c2);
		if (c3) this.uniforms['u_color3'].value = hexToVec3(c3);
		if (bc) this.uniforms['u_boundaryColor'].value = hexToVec3(bc);

		const s0 = p['zone-1-size']?.value as number | undefined;
		const s1 = p['zone-2-size']?.value as number | undefined;
		const s2 = p['zone-3-size']?.value as number | undefined;
		const s3 = p['zone-4-size']?.value as number | undefined;
		const v0 = p['zone-1-visible']?.value !== false;
		const v1 = p['zone-2-visible']?.value !== false;
		const v2 = p['zone-3-visible']?.value !== false;
		const v3 = p['zone-4-visible']?.value !== false;
		const breaks = computeBreaks(
			v0 ? (s0 ?? defaultSizes[0]) : 0,
			v1 ? (s1 ?? defaultSizes[1]) : 0,
			v2 ? (s2 ?? defaultSizes[2]) : 0,
			v3 ? (s3 ?? defaultSizes[3]) : 0
		);
		(this.uniforms['u_breaks'].value as Vector4).copy(breaks);
	};
}

const post: Post = {
	summary: {
		id: 'lava-territories',
		tags: ['animation', 'shader', 'fluid'],
		title: 'Lava Territories',
		timestamp: new Date(2026, 3, 6),
		type: PostType.experiment3d
	},
	params,
	content: () => new LavaTerritories()
};

export default post;
