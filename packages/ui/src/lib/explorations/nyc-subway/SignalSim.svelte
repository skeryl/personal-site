<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		ROUTE_LENGTH_M,
		PHYSICS,
		STATIONS,
		JUNCTIONS,
		SPEED_RESTRICTIONS,
		FIXED_BLOCK,
		LINE_COLORS,
		TPH_MEASUREMENT_M,
		generateBlocks,
		type JunctionDef
	} from './signal-sim-data';

	let canvas: HTMLCanvasElement;
	let animFrame: number;
	let trainCount = 10;
	let speedMultiplier = 20;
	let crossTraffic = true;
	let fixedTPH = 0;
	let cbtcTPH = 0;

	// --- Simulation state ---
	type TrainState = 'running' | 'dwelling';

	interface SimTrain {
		positionM: number;
		velocityMps: number;
		state: TrainState;
		dwellRemaining: number;
		delayRemaining: number;
		nextStationIdx: number; // next station to stop at
		id: number;
		justCrossed: boolean; // TPH crossing flag
	}

	interface JunctionState {
		def: JunctionDef;
		locked: boolean;
		lockRemaining: number;
		nextConflict: number;
		// Visual crossing train
		crossingProgress: number; // 0-1, how far through the crossing animation
		crossingActive: boolean;
		crossingWaiting: boolean; // waiting for F train to clear before crossing
		crossingLine: string; // which line is crossing (for color)
	}

	// Stable blocks (generated once)
	const blocks = generateBlocks();

	let fTrains: SimTrain[] = [];
	let cTrains: SimTrain[] = [];
	let fJunctions: JunctionState[] = [];
	let cJunctions: JunctionState[] = [];
	let fCrossTimes: number[] = [];
	let cCrossTimes: number[] = [];
	let simTime = 0;

	// Wrap-around distance for the loop
	// Trains go from 0 → ROUTE_LENGTH_M then wrap back to 0
	const WRAP_DWELL = 35; // turnaround dwell at Church Ave before wrapping

	function initTrains(n: number): SimTrain[] {
		const trains: SimTrain[] = [];
		const spacing = ROUTE_LENGTH_M / n;
		for (let i = 0; i < n; i++) {
			const pos = (i * spacing) % ROUTE_LENGTH_M;
			// Find next station ahead
			let nextSt = STATIONS.findIndex((s) => s.positionM > pos);
			if (nextSt === -1) nextSt = 0;
			trains.push({
				positionM: pos,
				velocityMps: PHYSICS.TYPICAL_MAX_MPS * 0.5,
				state: 'running',
				dwellRemaining: 0,
				delayRemaining: 0,
				nextStationIdx: nextSt,
				id: i,
				justCrossed: false
			});
		}
		return trains;
	}

	function initJunctions(): JunctionState[] {
		return JUNCTIONS.map((def) => ({
			def,
			locked: false,
			lockRemaining: 0,
			nextConflict: def.conflictIntervalS * (0.3 + Math.random() * 0.7),
			crossingProgress: 0,
			crossingActive: false,
			crossingWaiting: false,
			crossingLine: def.conflictingLines[0] || 'G'
		}));
	}

	// --- Physics helpers ---
	function brakingDistance(v: number): number {
		return (v * v) / (2 * PHYSICS.BRK_MPS2);
	}

	function localSpeedLimit(posM: number): number {
		for (const r of SPEED_RESTRICTIONS) {
			if (posM >= r.startM && posM <= r.endM) return r.maxSpeedMps;
		}
		return PHYSICS.TYPICAL_MAX_MPS;
	}

	// Wrap-aware distance from a to b (always positive, in direction of travel)
	function wrapDist(from: number, to: number): number {
		const d = to - from;
		return d >= 0 ? d : d + ROUTE_LENGTH_M;
	}

	// Distance to nearest train ahead (wrap-aware)
	function distToTrainAhead(train: SimTrain, allTrains: SimTrain[]): number {
		let minDist = Infinity;
		const headPos = train.positionM;
		for (const other of allTrains) {
			if (other.id === train.id) continue;
			// Distance from our head to their tail
			const otherTail = other.positionM - PHYSICS.TRAIN_LENGTH_M;
			const d = wrapDist(headPos, otherTail);
			if (d > 0 && d < minDist) minDist = d;
		}
		return minDist;
	}

	// --- Fixed-block helpers ---
	function blockIndex(posM: number): number {
		if (posM < 0) return 0;
		if (posM >= ROUTE_LENGTH_M) return blocks.length - 1;
		for (let i = 0; i < blocks.length; i++) {
			if (posM >= blocks[i].startM && posM < blocks[i].endM) return i;
		}
		return blocks.length - 1;
	}

	function isBlockOccupied(bIdx: number, trains: SimTrain[]): boolean {
		const b = blocks[bIdx];
		if (!b) return false;
		for (const t of trains) {
			const front = t.positionM;
			const rear = t.positionM - PHYSICS.TRAIN_LENGTH_M;
			// Train occupies this block if any part overlaps
			if (front > b.startM && rear < b.endM) return true;
		}
		return false;
	}

	function isJunctionLocked(posM: number, junctions: JunctionState[]): boolean {
		for (const j of junctions) {
			if (!j.locked) continue;
			// Lock blocks within 200m of junction
			if (Math.abs(posM - j.def.positionM) < 200) return true;
		}
		return false;
	}

	type SignalAspect = 'green' | 'yellow' | 'red';

	function getSignalAspect(
		bIdx: number,
		trains: SimTrain[],
		junctions: JunctionState[]
	): SignalAspect {
		const nextB = (bIdx + 1) % blocks.length;
		const nextOcc = isBlockOccupied(nextB, trains);
		const nextLocked = isJunctionLocked(blocks[nextB]?.startM ?? 0, junctions);

		if (nextOcc || nextLocked) return 'red';

		const nextNextB = (nextB + 1) % blocks.length;
		if (
			isBlockOccupied(nextNextB, trains) ||
			isJunctionLocked(blocks[nextNextB]?.startM ?? 0, junctions)
		) {
			return 'yellow';
		}
		return 'green';
	}

	// Check if any train is within the junction clearance zone
	function isJunctionZoneClear(junctionPosM: number, trains: SimTrain[]): boolean {
		const clearance = 100; // meters on each side that must be clear
		for (const t of trains) {
			// Skip trains off the visible track
			if (t.positionM < -10 || t.positionM > ROUTE_LENGTH_M + 10) continue;
			const trainFront = t.positionM;
			const trainRear = t.positionM - PHYSICS.TRAIN_LENGTH_M;
			if (trainFront > junctionPosM - clearance && trainRear < junctionPosM + clearance) {
				return false;
			}
		}
		return true;
	}

	// --- Junction simulation ---
	function stepJunctionsShared(
		junctions: JunctionState[],
		dt: number,
		isCbtc: boolean,
		trains: SimTrain[]
	): void {
		if (!crossTraffic) {
			for (const j of junctions) {
				j.locked = false;
				j.lockRemaining = 0;
				j.crossingActive = false;
				j.crossingWaiting = false;
				j.crossingProgress = 0;
			}
			return;
		}
		for (const j of junctions) {
			// Crossing train animation: only progress when junction zone is clear
			if (j.crossingActive) {
				if (j.crossingWaiting) {
					// Waiting for F train to clear the zone
					if (isJunctionZoneClear(j.def.positionM, trains)) {
						j.crossingWaiting = false; // zone clear, start crossing
					}
				}
				if (!j.crossingWaiting) {
					const crossDuration = isCbtc ? 12 : 18; // seconds sim-time for the circle to cross
					j.crossingProgress += dt / crossDuration;
					if (j.crossingProgress >= 1) {
						j.crossingActive = false;
						j.crossingProgress = 0;
					}
				}
			}

			if (j.locked) {
				// Don't release lock until crossing train has finished
				if (!j.crossingActive) {
					j.lockRemaining -= dt;
				}
				if (j.lockRemaining <= 0 && !j.crossingActive) {
					j.locked = false;
					j.nextConflict = j.def.conflictIntervalS * (0.6 + Math.random() * 0.8);
				}
			} else {
				j.nextConflict -= dt;
				if (j.nextConflict <= 0) {
					// Only lock if the zone is clear — prevents deadlock where a
					// dwelling train can't leave because the junction it's sitting in just locked
					if (isJunctionZoneClear(j.def.positionM, trains)) {
						j.locked = true;
						j.lockRemaining = isCbtc ? j.def.cbtcDurationS : j.def.conflictDurationS;
						// Zone is already clear, so crossing train can go immediately
						j.crossingActive = true;
						j.crossingWaiting = false;
						j.crossingProgress = 0;
						const lines = j.def.conflictingLines;
						j.crossingLine = lines[Math.floor(Math.random() * lines.length)];
					}
					// else: zone occupied, keep nextConflict at 0 so we retry next frame
				}
			}
		}
	}

	// --- Fixed block stepping ---
	function stepFixed(dt: number): void {
		stepJunctionsShared(fJunctions, dt, false, fTrains);

		for (const t of fTrains) {
			// Handle dwelling
			if (t.state === 'dwelling') {
				if (t.delayRemaining > 0) {
					t.delayRemaining -= dt;
					if (t.delayRemaining < 0) t.delayRemaining = 0;
				}
				t.dwellRemaining -= dt;
				if (t.dwellRemaining <= 0 && t.delayRemaining <= 0) {
					t.state = 'running';
					t.dwellRemaining = 0;
					// Advance to next station
					t.nextStationIdx = (t.nextStationIdx + 1) % STATIONS.length;
				}
				continue;
			}

			// Running: compute target speed
			const limit = localSpeedLimit(t.positionM);
			let targetV = limit;

			// Signal constraints
			const bIdx = blockIndex(t.positionM);
			const aspect = getSignalAspect(bIdx, fTrains, fJunctions);

			if (aspect === 'red') {
				const nextBlockStart = bIdx + 1 < blocks.length ? blocks[bIdx + 1].startM : ROUTE_LENGTH_M;
				const distToBlock = nextBlockStart - t.positionM;
				if (distToBlock < brakingDistance(t.velocityMps) + 20) {
					targetV = 0;
				} else {
					targetV = Math.min(targetV, FIXED_BLOCK.YELLOW_SPEED_MPS);
				}
			} else if (aspect === 'yellow') {
				targetV = Math.min(targetV, FIXED_BLOCK.YELLOW_SPEED_MPS);
			}

			// Direct junction clearance — stop before locked junctions
			for (const j of fJunctions) {
				if (!j.locked) continue;
				const distToJ = j.def.positionM - t.positionM;
				if (distToJ > 0 && distToJ < brakingDistance(t.velocityMps) + 150) {
					const jV = Math.max(0, Math.sqrt(2 * PHYSICS.BRK_MPS2 * Math.max(0, distToJ - 80)));
					targetV = Math.min(targetV, jV);
				}
			}

			// Station approach
			const station = STATIONS[t.nextStationIdx];
			const distToStation = station.positionM - t.positionM;

			if (distToStation > 0 && distToStation < brakingDistance(t.velocityMps) + 20) {
				const stV = Math.sqrt(Math.max(0, 2 * PHYSICS.BRK_MPS2 * Math.max(0, distToStation - 3)));
				targetV = Math.min(targetV, stV);
			}

			// Arrived at station?
			if (distToStation >= -5 && distToStation <= 3 && t.velocityMps < 1) {
				t.positionM = station.positionM;
				t.velocityMps = 0;
				t.state = 'dwelling';
				// Terminal gets extra dwell for "turnaround"
				const isTerminal = t.nextStationIdx === STATIONS.length - 1;
				t.dwellRemaining = station.dwellSeconds + (isTerminal ? WRAP_DWELL : 0);
				// If terminal, wrap: set index so depart logic targets station 0
				if (isTerminal) {
					t.nextStationIdx = STATIONS.length - 1; // (14+1)%15 = 0 on depart
					t.positionM = -PHYSICS.TRAIN_LENGTH_M; // off-screen left, will run toward station 0
				}
				continue;
			}

			// Anti-collision
			const ahead = distToTrainAhead(t, fTrains);
			if (ahead < PHYSICS.TRAIN_LENGTH_M + 5) {
				targetV = 0;
			} else if (ahead < brakingDistance(t.velocityMps) + PHYSICS.TRAIN_LENGTH_M + 30) {
				targetV = Math.min(targetV, Math.max(0, ahead - PHYSICS.TRAIN_LENGTH_M - 10) * 0.3);
			}

			// Apply acceleration/braking
			if (t.velocityMps < targetV) {
				t.velocityMps = Math.min(targetV, t.velocityMps + PHYSICS.ACC_MPS2 * dt);
			} else if (t.velocityMps > targetV) {
				t.velocityMps = Math.max(targetV, t.velocityMps - PHYSICS.BRK_MPS2 * dt);
			}
			t.velocityMps = Math.max(0, t.velocityMps);

			const oldPos = t.positionM;
			t.positionM += t.velocityMps * dt;

			// TPH crossing
			if (oldPos < TPH_MEASUREMENT_M && t.positionM >= TPH_MEASUREMENT_M && !t.justCrossed) {
				fCrossTimes.push(simTime);
				t.justCrossed = true;
				if (fCrossTimes.length > 30) fCrossTimes = fCrossTimes.slice(-25);
			}
			if (t.positionM > TPH_MEASUREMENT_M + 500) t.justCrossed = false;
			if (t.positionM < TPH_MEASUREMENT_M - 500) t.justCrossed = false;
		}
	}

	// --- CBTC stepping ---
	function stepCBTC(dt: number): void {
		stepJunctionsShared(cJunctions, dt, true, cTrains);

		for (const t of cTrains) {
			if (t.state === 'dwelling') {
				if (t.delayRemaining > 0) {
					t.delayRemaining -= dt;
					if (t.delayRemaining < 0) t.delayRemaining = 0;
				}
				t.dwellRemaining -= dt;
				if (t.dwellRemaining <= 0 && t.delayRemaining <= 0) {
					t.state = 'running';
					t.dwellRemaining = 0;
					t.nextStationIdx = (t.nextStationIdx + 1) % STATIONS.length;
				}
				continue;
			}

			const limit = localSpeedLimit(t.positionM);
			let targetV = limit;

			// Moving block: brake based on distance to train ahead
			const ahead = distToTrainAhead(t, cTrains);
			// Min 50m buffer even when stopped (platform clearance + safety)
			const safetyEnvelope = brakingDistance(t.velocityMps) + t.velocityMps * 0.5 + 50;

			if (ahead < safetyEnvelope * 0.6) {
				targetV = 0;
			} else if (ahead < safetyEnvelope) {
				targetV = Math.min(targetV, t.velocityMps * 0.4);
			} else if (ahead < safetyEnvelope * 1.3) {
				targetV = Math.min(targetV, t.velocityMps);
			}

			// Junction locks — stop with clearance for crossing train
			for (const j of cJunctions) {
				if (!j.locked) continue;
				const distToJ = j.def.positionM - t.positionM;
				// Stop 80m before junction to leave visible gap
				if (distToJ > 0 && distToJ < safetyEnvelope + 150) {
					const jTargetV = Math.max(0, (distToJ - 80) * 0.4);
					targetV = Math.min(targetV, jTargetV);
				}
			}

			// Station approach
			const station = STATIONS[t.nextStationIdx];
			const distToStation = station.positionM - t.positionM;

			if (distToStation > 0 && distToStation < brakingDistance(t.velocityMps) + 15) {
				const stV = Math.sqrt(Math.max(0, 2 * PHYSICS.BRK_MPS2 * Math.max(0, distToStation - 2)));
				targetV = Math.min(targetV, stV);
			}

			// Arrived at station?
			if (distToStation >= -5 && distToStation <= 3 && t.velocityMps < 1) {
				t.positionM = station.positionM;
				t.velocityMps = 0;
				t.state = 'dwelling';
				const isTerminal = t.nextStationIdx === STATIONS.length - 1;
				// CBTC enables faster dwell (precise stopping, better door timing)
				t.dwellRemaining = station.dwellSeconds * 0.8 + (isTerminal ? WRAP_DWELL * 0.7 : 0);
				if (isTerminal) {
					t.positionM = -PHYSICS.TRAIN_LENGTH_M;
				}
				continue;
			}

			// Apply acceleration/braking
			if (t.velocityMps < targetV) {
				t.velocityMps = Math.min(targetV, t.velocityMps + PHYSICS.ACC_MPS2 * dt);
			} else if (t.velocityMps > targetV) {
				t.velocityMps = Math.max(targetV, t.velocityMps - PHYSICS.BRK_MPS2 * dt);
			}
			t.velocityMps = Math.max(0, t.velocityMps);

			const oldPos = t.positionM;
			t.positionM += t.velocityMps * dt;

			// TPH crossing
			if (oldPos < TPH_MEASUREMENT_M && t.positionM >= TPH_MEASUREMENT_M && !t.justCrossed) {
				cCrossTimes.push(simTime);
				t.justCrossed = true;
				if (cCrossTimes.length > 30) cCrossTimes = cCrossTimes.slice(-25);
			}
			if (t.positionM > TPH_MEASUREMENT_M + 500) t.justCrossed = false;
			if (t.positionM < TPH_MEASUREMENT_M - 500) t.justCrossed = false;
		}
	}

	function calcTPH(times: number[]): number {
		if (times.length < 3) return 0;
		const n = Math.min(times.length, 10);
		const recent = times.slice(-n);
		const span = recent[n - 1] - recent[0];
		if (span <= 0) return 0;
		const avgHeadway = span / (n - 1);
		return Math.round(3600 / avgHeadway);
	}

	// --- Rendering ---
	function render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
		if (w < 10) return;
		const dpr = Math.min(window.devicePixelRatio, 2);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		ctx.fillStyle = '#0c0c16';
		ctx.fillRect(0, 0, w, h);

		const px = 20;
		const tw = w - px * 2;
		const midY = h / 2;
		const t1y = 110;
		const t2y = midY + 110;

		drawLabels(ctx, px, tw, midY);
		drawDivider(ctx, px, tw, midY);
		drawMeasurementLine(ctx, px, tw, h);
		drawFixedTrack(ctx, px, t1y, tw);
		drawCBTCTrack(ctx, px, t2y, tw);
		// Station labels drawn AFTER tracks so they render on top
		drawStationLabels(ctx, px, t1y - 35, tw);
		drawStationLabels(ctx, px, t2y - 35, tw);
	}

	function m2x(posM: number, trackX: number, trackW: number): number {
		return trackX + (posM / ROUTE_LENGTH_M) * trackW;
	}

	function drawLabels(ctx: CanvasRenderingContext2D, px: number, tw: number, midY: number): void {
		ctx.font = '600 11px system-ui, -apple-system, sans-serif';
		ctx.letterSpacing = '0.05em';
		ctx.textAlign = 'left';
		ctx.fillStyle = 'rgba(255,255,255,0.4)';
		ctx.fillText('FIXED BLOCK (1930s)', px, 20);
		ctx.fillText('CBTC (MODERN)', px, midY + 16);
		ctx.letterSpacing = '0';

		ctx.textAlign = 'right';
		ctx.font = 'bold 14px system-ui';
		if (simTime < 30) {
			ctx.fillStyle = 'rgba(255,255,255,0.15)';
			ctx.fillText('— TPH', px + tw, 20);
			ctx.fillText('— TPH', px + tw, midY + 16);
		} else {
			ctx.fillStyle = fixedTPH > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.15)';
			ctx.fillText(fixedTPH > 0 ? `${fixedTPH} TPH` : '— TPH', px + tw, 20);
			ctx.fillStyle = cbtcTPH > 0 ? 'rgba(108, 190, 69, 0.9)' : 'rgba(255,255,255,0.15)';
			ctx.fillText(cbtcTPH > 0 ? `${cbtcTPH} TPH` : '— TPH', px + tw, midY + 16);
		}
	}

	function drawDivider(ctx: CanvasRenderingContext2D, px: number, tw: number, midY: number): void {
		ctx.strokeStyle = 'rgba(255,255,255,0.05)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(px, midY);
		ctx.lineTo(px + tw, midY);
		ctx.stroke();
	}

	function drawMeasurementLine(
		ctx: CanvasRenderingContext2D,
		px: number,
		tw: number,
		h: number
	): void {
		const mx = m2x(TPH_MEASUREMENT_M, px, tw);
		ctx.setLineDash([3, 4]);
		ctx.strokeStyle = 'rgba(255,255,255,0.08)';
		ctx.beginPath();
		ctx.moveTo(mx, 28);
		ctx.lineTo(mx, h - 10);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.font = '8px system-ui';
		ctx.fillStyle = 'rgba(255,255,255,0.12)';
		ctx.textAlign = 'center';
		ctx.fillText('↑ TPH', mx, h - 2);
	}

	function drawStationLabels(
		ctx: CanvasRenderingContext2D,
		px: number,
		y: number,
		tw: number
	): void {
		const narrow = tw < 500;
		ctx.font = `${narrow ? 7 : 9}px system-ui`;
		ctx.textAlign = 'left';

		for (let i = 0; i < STATIONS.length; i++) {
			const st = STATIONS[i];
			const x = m2x(st.positionM, px, tw);

			// Station tick
			ctx.strokeStyle = 'rgba(255,255,255,0.15)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, y + 28);
			ctx.lineTo(x, y + 42);
			ctx.stroke();

			// Station name (rotated)
			const label = narrow ? st.shortName : st.name.length > 14 ? st.shortName : st.name;
			ctx.save();
			ctx.translate(x + 2, y + 26);
			ctx.rotate(-Math.PI / 4);
			ctx.fillStyle = st.junctionId ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)';
			ctx.fillText(label, 0, 0);
			ctx.restore();

			// Transfer line dots (skip on narrow)
			if (st.transferLines.length > 0 && !narrow) {
				const dotY = y + 46;
				const seen = new Set<string>();
				let dx = 0;
				for (const line of st.transferLines) {
					const color = LINE_COLORS[line];
					if (!color || seen.has(color)) continue;
					seen.add(color);
					ctx.beginPath();
					ctx.arc(x + dx, dotY, 2, 0, Math.PI * 2);
					ctx.fillStyle = color + '80';
					ctx.fill();
					dx += 5;
				}
			}
		}
	}

	// Find the pair of consecutive trains with smallest gap (for annotation)
	function findClosestPair(
		trains: SimTrain[]
	): { leader: SimTrain; follower: SimTrain; gap: number } | null {
		let best: { leader: SimTrain; follower: SimTrain; gap: number } | null = null;
		for (const t of trains) {
			if (t.positionM < 0 || t.positionM > ROUTE_LENGTH_M) continue;
			const ahead = distToTrainAhead(t, trains);
			if (ahead < Infinity && (!best || ahead < best.gap)) {
				// Find the leader
				for (const o of trains) {
					if (o.id === t.id) continue;
					const d = wrapDist(t.positionM, o.positionM - PHYSICS.TRAIN_LENGTH_M);
					if (Math.abs(d - ahead) < 10) {
						best = { leader: o, follower: t, gap: ahead };
						break;
					}
				}
			}
		}
		return best;
	}

	function drawFixedTrack(ctx: CanvasRenderingContext2D, px: number, y: number, tw: number): void {
		const bh = 42;

		// Track bed
		ctx.fillStyle = '#13131e';
		ctx.fillRect(px, y - bh / 2 - 2, tw, bh + 4);

		// F/G shared section
		const fgStart = m2x(4200, px, tw);
		const fgEnd = m2x(6900, px, tw);
		ctx.fillStyle = 'rgba(108, 190, 69, 0.03)';
		ctx.fillRect(fgStart, y - bh / 2 - 2, fgEnd - fgStart, bh + 4);

		// Blocks and signals
		let annotatedBlock = -1; // Track which block we annotate as "wasted"
		for (let i = 0; i < blocks.length; i++) {
			const bx = m2x(blocks[i].startM, px, tw);
			const bw = m2x(blocks[i].endM, px, tw) - bx;
			if (bw < 1) continue;
			const aspect = getSignalAspect(i, fTrains, fJunctions);
			const occ = isBlockOccupied(i, fTrains);

			// Block shading
			if (occ) {
				// Occupied: solid red tint for the whole block
				ctx.fillStyle = 'rgba(255, 71, 87, 0.15)';
				ctx.fillRect(bx + 0.5, y - bh / 2, bw - 1, bh);

				// "Wasted space" hatching: show the empty part of occupied blocks
				// Find trains in this block and draw diagonal lines in the empty portions
				const blockStart = blocks[i].startM;
				const blockEnd = blocks[i].endM;
				for (const t of fTrains) {
					const trainFront = t.positionM;
					const trainRear = t.positionM - PHYSICS.TRAIN_LENGTH_M;
					if (trainFront > blockStart && trainRear < blockEnd) {
						// Train is in this block — shade the empty portion with hatching
						const emptyStartPx = bx + 0.5;
						const trainRearPx = m2x(Math.max(trainRear, blockStart), px, tw);
						const emptyW = trainRearPx - emptyStartPx;
						if (emptyW > 8) {
							// Diagonal hatch lines to show "locked but empty"
							ctx.save();
							ctx.beginPath();
							ctx.rect(emptyStartPx, y - bh / 2, emptyW, bh);
							ctx.clip();
							ctx.strokeStyle = 'rgba(255, 71, 87, 0.12)';
							ctx.lineWidth = 0.5;
							for (let hx = emptyStartPx - bh; hx < emptyStartPx + emptyW + bh; hx += 5) {
								ctx.beginPath();
								ctx.moveTo(hx, y - bh / 2);
								ctx.lineTo(hx + bh, y + bh / 2);
								ctx.stroke();
							}
							ctx.restore();
							if (annotatedBlock === -1 && emptyW > 15) annotatedBlock = i;
						}
					}
				}
			} else if (aspect === 'red') {
				// Next block is red but this block is clear — show it's blocked by signal
				ctx.fillStyle = 'rgba(255, 71, 87, 0.06)';
				ctx.fillRect(bx + 0.5, y - bh / 2, bw - 1, bh);
			} else if (aspect === 'yellow') {
				ctx.fillStyle = 'rgba(255, 192, 72, 0.08)';
				ctx.fillRect(bx + 0.5, y - bh / 2, bw - 1, bh);
			} else {
				ctx.fillStyle = 'rgba(46, 213, 115, 0.02)';
				ctx.fillRect(bx + 0.5, y - bh / 2, bw - 1, bh);
			}

			// Block boundary
			ctx.fillStyle = 'rgba(255,255,255,0.04)';
			ctx.fillRect(bx, y - bh / 2 - 3, 0.5, bh + 6);

			// Signal dot
			if (bw > 5) {
				const sy = y - bh / 2 - 6;
				ctx.beginPath();
				ctx.arc(bx + 1, sy, 1.8, 0, Math.PI * 2);
				ctx.fillStyle = aspect === 'red' ? '#ff4757' : aspect === 'yellow' ? '#ffc048' : '#2ed573';
				ctx.fill();
			}
		}

		// "Locked" annotation on one hatched block
		if (annotatedBlock >= 0) {
			const ab = blocks[annotatedBlock];
			const abx = m2x(ab.startM, px, tw);
			ctx.font = '7px system-ui';
			ctx.fillStyle = 'rgba(255, 71, 87, 0.5)';
			ctx.textAlign = 'center';
			ctx.fillText('locked', abx + 10, y + bh / 2 + 9);
		}

		// Rail
		ctx.fillStyle = 'rgba(255,255,255,0.1)';
		ctx.fillRect(px, y - 0.5, tw, 1);

		for (const t of fTrains) drawTrain(ctx, t, px, y, tw);

		// Crossing trains at junctions
		for (const j of fJunctions) {
			if (!j.crossingActive) continue;
			drawCrossingTrain(ctx, j, px, y, tw, bh);
		}

		// Following distance annotation for closest pair
		const pair = findClosestPair(fTrains);
		if (
			pair &&
			pair.gap < 2000 &&
			pair.follower.positionM > 0 &&
			pair.leader.positionM < ROUTE_LENGTH_M
		) {
			const fx = m2x(pair.follower.positionM, px, tw);
			const lx = m2x(pair.leader.positionM - PHYSICS.TRAIN_LENGTH_M, px, tw);
			if (lx > fx + 20) {
				const midX = (fx + lx) / 2;
				const ay = y + bh / 2 + 14;
				// Bracket
				ctx.strokeStyle = 'rgba(255, 71, 87, 0.3)';
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(fx, ay - 3);
				ctx.lineTo(fx, ay);
				ctx.lineTo(lx, ay);
				ctx.lineTo(lx, ay - 3);
				ctx.stroke();
				// Distance label
				ctx.font = '8px system-ui';
				ctx.fillStyle = 'rgba(255, 71, 87, 0.5)';
				ctx.textAlign = 'center';
				ctx.fillText(`${Math.round(pair.gap)}m gap`, midX, ay + 9);
			}
		}
	}

	function drawCBTCTrack(ctx: CanvasRenderingContext2D, px: number, y: number, tw: number): void {
		ctx.fillStyle = '#111119';
		ctx.fillRect(px, y - 16, tw, 32);

		// F/G shared section
		const fgStart = m2x(4200, px, tw);
		const fgEnd = m2x(6900, px, tw);
		ctx.fillStyle = 'rgba(108, 190, 69, 0.03)';
		ctx.fillRect(fgStart, y - 16, fgEnd - fgStart, 32);

		// Rail
		ctx.fillStyle = 'rgba(255,255,255,0.08)';
		ctx.fillRect(px, y - 0.5, tw, 1);

		// Safety envelopes — always visible, even at low speed
		let annotatedEnvTrain: SimTrain | null = null;
		let annotatedEnvSize = 0;
		for (const t of cTrains) {
			if (t.positionM < 0 || t.positionM > ROUTE_LENGTH_M) continue;

			// Always show envelope — minimum 20m (safety margin) even when stopped
			const env = brakingDistance(t.velocityMps) + t.velocityMps * 0.5 + 50;
			const envPx = (env / ROUTE_LENGTH_M) * tw;
			const tx = m2x(t.positionM, px, tw);

			const ex = tx;
			const clampedX = Math.max(px, ex);
			const clampedEnd = Math.min(px + tw, ex + envPx);
			const clampedW = clampedEnd - clampedX;

			if (clampedW > 1) {
				// Solid leading edge + gradient fade
				const g = ctx.createLinearGradient(clampedX, 0, clampedX + clampedW, 0);
				const moving = t.velocityMps > 1;
				const alpha = moving ? 0.18 : 0.08;
				g.addColorStop(0, `rgba(108, 190, 69, ${alpha})`);
				g.addColorStop(0.3, `rgba(108, 190, 69, ${alpha * 0.6})`);
				g.addColorStop(1, 'rgba(108, 190, 69, 0)');
				ctx.fillStyle = g;
				ctx.fillRect(clampedX, y - 14, clampedW, 28);

				// Leading edge line for clarity
				if (moving && clampedW > 3) {
					ctx.strokeStyle = 'rgba(108, 190, 69, 0.25)';
					ctx.lineWidth = 0.5;
					ctx.beginPath();
					ctx.moveTo(clampedX, y - 14);
					ctx.lineTo(clampedX, y + 14);
					ctx.stroke();
				}
			}

			// Pick a mid-speed train for annotation
			if (t.velocityMps > 5 && t.velocityMps < 18 && env > annotatedEnvSize) {
				annotatedEnvTrain = t;
				annotatedEnvSize = env;
			}
		}

		// Annotate one envelope with braking distance
		if (annotatedEnvTrain) {
			const t = annotatedEnvTrain;
			const env = brakingDistance(t.velocityMps) + t.velocityMps * 0.5 + 50;
			const tx = m2x(t.positionM, px, tw);
			const envEnd = m2x(t.positionM + env, px, tw);
			if (envEnd < px + tw - 20 && envEnd > tx + 10) {
				ctx.font = '7px system-ui';
				ctx.fillStyle = 'rgba(108, 190, 69, 0.45)';
				ctx.textAlign = 'center';
				ctx.fillText(`${Math.round(env)}m safe zone`, (tx + envEnd) / 2, y - 18);
			}
		}

		for (const t of cTrains) drawTrain(ctx, t, px, y, tw);

		// Crossing trains at junctions
		for (const j of cJunctions) {
			if (!j.crossingActive) continue;
			drawCrossingTrain(ctx, j, px, y, tw, 28);
		}

		// Following distance annotation for closest pair
		const pair = findClosestPair(cTrains);
		if (
			pair &&
			pair.gap < 2000 &&
			pair.follower.positionM > 0 &&
			pair.leader.positionM < ROUTE_LENGTH_M
		) {
			const fx = m2x(pair.follower.positionM, px, tw);
			const lx = m2x(pair.leader.positionM - PHYSICS.TRAIN_LENGTH_M, px, tw);
			if (lx > fx + 10) {
				const midX = (fx + lx) / 2;
				const ay = y + 20;
				ctx.strokeStyle = 'rgba(108, 190, 69, 0.3)';
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(fx, ay - 3);
				ctx.lineTo(fx, ay);
				ctx.lineTo(lx, ay);
				ctx.lineTo(lx, ay - 3);
				ctx.stroke();
				ctx.font = '8px system-ui';
				ctx.fillStyle = 'rgba(108, 190, 69, 0.5)';
				ctx.textAlign = 'center';
				ctx.fillText(`${Math.round(pair.gap)}m gap`, midX, ay + 9);
			}
		}
	}

	function drawCrossingTrain(
		ctx: CanvasRenderingContext2D,
		j: JunctionState,
		trackX: number,
		trackY: number,
		trackW: number,
		trackH: number
	): void {
		const jx = m2x(j.def.positionM, trackX, trackW);
		const color = LINE_COLORS[j.crossingLine] || '#888';

		let cy: number;
		let alpha: number;

		if (j.crossingWaiting) {
			// Waiting at the top edge, steady glow (no flicker)
			cy = trackY - trackH / 2 - 14;
			alpha = 0.7;
		} else {
			const p = j.crossingProgress;
			// Fade in/out
			alpha = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
			// Animated vertical position (crosses through the track slowly)
			const travelH = trackH + 50;
			cy = trackY - travelH / 2 + p * travelH;
		}

		const r = 8;

		// Glow
		ctx.beginPath();
		ctx.arc(jx, cy, r + 4, 0, Math.PI * 2);
		ctx.fillStyle =
			color +
			Math.round(alpha * 0.15 * 255)
				.toString(16)
				.padStart(2, '0');
		ctx.fill();

		// Circle
		ctx.beginPath();
		ctx.arc(jx, cy, r, 0, Math.PI * 2);
		ctx.fillStyle =
			color +
			Math.round(alpha * 0.9 * 255)
				.toString(16)
				.padStart(2, '0');
		ctx.fill();

		// Line letter
		ctx.font = 'bold 8px system-ui';
		ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(j.crossingLine, jx, cy + 0.5);
		ctx.textBaseline = 'alphabetic';
	}

	function drawTrain(
		ctx: CanvasRenderingContext2D,
		t: SimTrain,
		trackX: number,
		trackY: number,
		trackW: number
	): void {
		// Don't draw trains off-screen
		if (
			t.positionM < -PHYSICS.TRAIN_LENGTH_M * 2 ||
			t.positionM > ROUTE_LENGTH_M + PHYSICS.TRAIN_LENGTH_M * 2
		)
			return;

		const tx = m2x(t.positionM, trackX, trackW);
		const tw = Math.max(4, (PHYSICS.TRAIN_LENGTH_M / ROUTE_LENGTH_M) * trackW);
		const th = 10;
		const delayed = t.delayRemaining > 0;
		const dwelling = t.state === 'dwelling';

		const left = tx - tw;
		const right = tx;
		const clampL = Math.max(trackX, left);
		const clampR = Math.min(trackX + trackW, right);
		const clampW = clampR - clampL;
		if (clampW <= 0) return;

		// Delay glow
		if (delayed) {
			const pulse = 0.15 + 0.08 * Math.sin(simTime * 4);
			ctx.fillStyle = `rgba(255, 71, 87, ${pulse})`;
			ctx.fillRect(clampL - 2, trackY - th / 2 - 2, clampW + 4, th + 4);
		}

		// Body
		ctx.fillStyle = delayed ? '#ff6b6b' : dwelling ? '#a0a0a8' : '#c0c0c8';
		ctx.fillRect(clampL, trackY - th / 2, clampW, th);

		// F line orange stripe
		ctx.fillStyle = delayed ? '#ff4757' : '#FF6319';
		ctx.fillRect(clampL, trackY + th / 2 - 2.5, clampW, 1.5);

		// Headlight
		if (!delayed && !dwelling && clampR <= trackX + trackW) {
			ctx.fillStyle = 'rgba(255, 255, 220, 0.8)';
			ctx.fillRect(clampR - 1.5, trackY - 2, 1.5, 4);
		}

		// Delay indicator
		if (delayed) {
			ctx.fillStyle = '#ff4757';
			ctx.font = 'bold 9px system-ui';
			ctx.textAlign = 'center';
			const cx = (clampL + clampR) / 2;
			ctx.fillText('!', cx, trackY - th / 2 - 5);
		}
	}

	// --- Lifecycle ---
	function reset(): void {
		fTrains = initTrains(trainCount);
		cTrains = initTrains(trainCount);
		fJunctions = initJunctions();
		cJunctions = initJunctions();
		fCrossTimes = [];
		cCrossTimes = [];
		simTime = 0;
		fixedTPH = 0;
		cbtcTPH = 0;
	}

	onMount(() => {
		reset();
		const ctx = canvas.getContext('2d')!;

		function loop() {
			const parent = canvas.parentElement;
			if (!parent) return;
			const rect = parent.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio, 2);
			const w = rect.width;
			const h = 400;

			const cw = Math.round(w * dpr);
			const ch = Math.round(h * dpr);
			if (canvas.width !== cw || canvas.height !== ch) {
				canvas.width = cw;
				canvas.height = ch;
				canvas.style.width = `${w}px`;
				canvas.style.height = `${h}px`;
			}

			// Sub-step for stability at high speed multipliers
			const maxDt = 1 / 15; // max ~67ms per sub-step
			const totalDt = (1 / 60) * speedMultiplier;
			const steps = Math.ceil(totalDt / maxDt);
			const dt = totalDt / steps;
			for (let s = 0; s < steps; s++) {
				stepFixed(dt);
				stepCBTC(dt);
				simTime += dt;
			}

			fixedTPH = calcTPH(fCrossTimes);
			cbtcTPH = calcTPH(cCrossTimes);

			render(ctx, w, h);
			animFrame = requestAnimationFrame(loop);
		}

		loop();
	});

	onDestroy(() => {
		if (animFrame) cancelAnimationFrame(animFrame);
	});

	function triggerDelay() {
		const DELAY_S = 30;
		for (const trains of [fTrains, cTrains]) {
			let best: SimTrain | null = null;
			let bestD = ROUTE_LENGTH_M;
			for (const t of trains) {
				if (t.delayRemaining > 0) continue;
				const d = Math.abs(t.positionM - TPH_MEASUREMENT_M);
				if (d < bestD) {
					bestD = d;
					best = t;
				}
			}
			if (best) {
				best.delayRemaining = DELAY_S;
				if (best.state === 'running') {
					best.state = 'dwelling';
					best.dwellRemaining = 0;
				}
			}
		}
	}

	function updateCount(e: Event) {
		trainCount = parseInt((e.target as HTMLInputElement).value);
		reset();
	}
</script>

<div class="signal-sim">
	<canvas bind:this={canvas}></canvas>
	<div class="sim-controls">
		<div class="control-group">
			<span class="control-label">Speed</span>
			<button
				class="speed-btn"
				class:active={speedMultiplier === 1}
				on:click={() => (speedMultiplier = 1)}>1x</button
			>
			<button
				class="speed-btn"
				class:active={speedMultiplier === 2}
				on:click={() => (speedMultiplier = 2)}>2x</button
			>
			<button
				class="speed-btn"
				class:active={speedMultiplier === 4}
				on:click={() => (speedMultiplier = 4)}>4x</button
			>
			<button
				class="speed-btn"
				class:active={speedMultiplier === 10}
				on:click={() => (speedMultiplier = 10)}>10x</button
			>
			<button
				class="speed-btn"
				class:active={speedMultiplier === 20}
				on:click={() => (speedMultiplier = 20)}>20x</button
			>
		</div>
		<label class="control-slider">
			<span class="control-label">Trains</span>
			<input type="range" min="5" max="20" value={trainCount} on:input={updateCount} />
			<span class="control-value">{trainCount}</span>
		</label>
		<label class="toggle">
			<input type="checkbox" bind:checked={crossTraffic} />
			<span class="toggle-label">Cross Traffic</span>
		</label>
		<button class="delay-btn" on:click={triggerDelay}> Simulate Delay </button>
	</div>
</div>

<style>
	.signal-sim {
		background: #0c0c16;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	canvas {
		display: block;
		width: 100%;
	}

	.sim-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 20px;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		gap: 12px;
		flex-wrap: wrap;
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.control-label {
		color: rgba(255, 255, 255, 0.55);
		font-size: 13px;
		margin-right: 4px;
	}

	.speed-btn {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.5);
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.speed-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
	}

	.speed-btn.active {
		background: rgba(108, 190, 69, 0.15);
		border-color: rgba(108, 190, 69, 0.3);
		color: #6cbe45;
	}

	.control-slider {
		display: flex;
		align-items: center;
		gap: 10px;
		color: rgba(255, 255, 255, 0.55);
		font-size: 13px;
		cursor: default;
	}

	.control-slider input[type='range'] {
		width: 80px;
		accent-color: #6cbe45;
		cursor: pointer;
	}

	.control-value {
		font-weight: 600;
		color: rgba(255, 255, 255, 0.85);
		min-width: 20px;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	.toggle input[type='checkbox'] {
		accent-color: #6cbe45;
		cursor: pointer;
	}

	.toggle-label {
		color: rgba(255, 255, 255, 0.55);
		font-size: 12px;
	}

	.delay-btn {
		background: rgba(255, 71, 87, 0.12);
		border: 1px solid rgba(255, 71, 87, 0.25);
		color: #ff6b81;
		padding: 6px 16px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.2s,
			border-color 0.2s;
	}

	.delay-btn:hover {
		background: rgba(255, 71, 87, 0.22);
		border-color: rgba(255, 71, 87, 0.45);
	}

	.delay-btn:active {
		background: rgba(255, 71, 87, 0.32);
	}

	@media (max-width: 600px) {
		.sim-controls {
			padding: 10px 12px;
			gap: 8px;
		}
		.toggle-label {
			font-size: 11px;
		}
	}
</style>
