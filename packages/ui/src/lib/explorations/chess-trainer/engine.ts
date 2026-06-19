import { Chess, type Move as ChessMove, type Square } from 'chess.js';
import type { Color, Repertoire, RepertoireMove } from './types';

export interface Trail {
	chess: Chess;
	nodes: RepertoireMove[];
	version: number;
}

export function newTrail(repertoire: Repertoire): Trail {
	return {
		chess: new Chess(repertoire.startFen),
		nodes: [],
		version: 0
	};
}

export function currentChildren(trail: Trail, repertoire: Repertoire): RepertoireMove[] {
	const last = trail.nodes[trail.nodes.length - 1];
	return last?.children ?? repertoire.root;
}

export function turnColor(trail: Trail): Color {
	return trail.chess.turn() === 'w' ? 'white' : 'black';
}

export function isUsersTurn(trail: Trail, repertoire: Repertoire): boolean {
	return turnColor(trail) === repertoire.color;
}

function pickWeighted(moves: RepertoireMove[]): RepertoireMove {
	const total = moves.reduce((s, m) => s + (m.weight ?? 1), 0);
	let r = Math.random() * total;
	for (const m of moves) {
		r -= m.weight ?? 1;
		if (r <= 0) return m;
	}
	return moves[moves.length - 1];
}

export function pickOpponentMove(children: RepertoireMove[]): RepertoireMove {
	return pickWeighted(children);
}

export function applyMove(trail: Trail, node: RepertoireMove): ChessMove | null {
	const move = trail.chess.move(node.san);
	if (!move) return null;
	trail.nodes.push(node);
	trail.version += 1;
	return move;
}

export function findUserMove(
	children: RepertoireMove[],
	sanOrVerbose: { san: string } | string
): RepertoireMove | undefined {
	const san = typeof sanOrVerbose === 'string' ? sanOrVerbose : sanOrVerbose.san;
	return children.find((c) => c.san === san);
}

export type SquareKey = Square;

export function legalDests(chess: Chess): Map<SquareKey, SquareKey[]> {
	const dests = new Map<SquareKey, SquareKey[]>();
	for (const move of chess.moves({ verbose: true })) {
		const list = dests.get(move.from) ?? [];
		list.push(move.to);
		dests.set(move.from, list);
	}
	return dests;
}

export interface AttemptResult {
	kind: 'correct' | 'incorrect';
	move: ChessMove;
	node?: RepertoireMove;
}

export function attemptUserMove(
	trail: Trail,
	repertoire: Repertoire,
	from: SquareKey,
	to: SquareKey,
	promotion?: 'q' | 'r' | 'b' | 'n'
): AttemptResult | null {
	const probe = new Chess(trail.chess.fen());
	const attempt = probe.move({ from, to, promotion: promotion ?? 'q' });
	if (!attempt) return null;

	const children = currentChildren(trail, repertoire);
	const matched = children.find((c) => c.san === attempt.san);
	if (matched) {
		const real = trail.chess.move({ from, to, promotion: promotion ?? 'q' })!;
		trail.nodes.push(matched);
		trail.version += 1;
		return { kind: 'correct', move: real, node: matched };
	}
	return { kind: 'incorrect', move: attempt };
}

export function isLineComplete(trail: Trail, repertoire: Repertoire): boolean {
	return currentChildren(trail, repertoire).length === 0;
}
