<script lang="ts">
	import { onMount } from 'svelte';
	import Board from './Board.svelte';
	import { repertoires } from './repertoires';
	import type { Repertoire, RepertoireMove } from './types';
	import {
		newTrail,
		currentChildren,
		turnColor,
		isUsersTurn,
		pickOpponentMove,
		applyMove,
		attemptUserMove,
		legalDests,
		isLineComplete
	} from './engine';
	import type { Trail, SquareKey } from './engine';
	import type { Api } from 'chessground/api';
	import type { Color as CgColor, Key, Dests } from 'chessground/types';

	type Status =
		| { kind: 'awaiting-user' }
		| { kind: 'correct'; node: RepertoireMove }
		| { kind: 'wrong'; attempted: string; expected: string[] }
		| { kind: 'line-complete' };

	let selected: Repertoire = $state(repertoires[0]);
	let trail: Trail = $state(newTrail(selected));
	let status: Status = $state({ kind: 'awaiting-user' } as Status);
	let boardApi: Api | undefined = $state();
	let stats = $state({ linesCompleted: 0, correctMoves: 0, mistakes: 0 });
	let hintShown = $state(false);

	// Reading trail.version subscribes derivations to chess.js mutations.
	const fen = $derived((trail.version, trail.chess.fen()));
	const toMove: CgColor = $derived((trail.version, turnColor(trail)) as CgColor);
	const orientation: CgColor = $derived(selected.color as CgColor);
	const usersTurn = $derived((trail.version, isUsersTurn(trail, selected)));
	const children = $derived((trail.version, currentChildren(trail, selected)));
	const dests: Dests = $derived(
		usersTurn && status.kind !== 'line-complete'
			? (legalDests(trail.chess) as unknown as Dests)
			: (new Map() as Dests)
	);
	const movable: CgColor | undefined = $derived(usersTurn ? (toMove as CgColor) : undefined);
	const lastMove: [Key, Key] | undefined = $derived.by(() => {
		trail.version;
		const history = trail.chess.history({ verbose: true });
		if (!history.length) return undefined;
		const last = history[history.length - 1];
		return [last.from as Key, last.to as Key];
	});

	onMount(() => {
		setTimeout(maybePlayOpponent, 200);
	});

	function resetLine() {
		trail = newTrail(selected);
		status = { kind: 'awaiting-user' };
		hintShown = false;
		setTimeout(maybePlayOpponent, 200);
	}

	function changeRepertoire(r: Repertoire) {
		selected = r;
		resetLine();
	}

	function handleRepertoireChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const r = repertoires.find((rep) => rep.id === target.value);
		if (r) changeRepertoire(r);
	}

	function maybePlayOpponent() {
		if (isLineComplete(trail, selected)) {
			status = { kind: 'line-complete' };
			stats.linesCompleted += 1;
			return;
		}
		if (!isUsersTurn(trail, selected)) {
			const child = pickOpponentMove(currentChildren(trail, selected));
			applyMove(trail, child);
			if (isLineComplete(trail, selected)) {
				status = { kind: 'line-complete' };
				stats.linesCompleted += 1;
			} else {
				status = { kind: 'awaiting-user' };
			}
		}
	}

	function handleUserMove(from: Key, to: Key) {
		if (!isUsersTurn(trail, selected)) return;
		const result = attemptUserMove(trail, selected, from as SquareKey, to as SquareKey, 'q');
		if (!result) return;
		if (result.kind === 'correct') {
			stats.correctMoves += 1;
			status = { kind: 'correct', node: result.node! };
			hintShown = false;
			setTimeout(() => {
				if (isLineComplete(trail, selected)) {
					status = { kind: 'line-complete' };
					stats.linesCompleted += 1;
				} else {
					maybePlayOpponent();
				}
			}, 450);
		} else {
			stats.mistakes += 1;
			status = {
				kind: 'wrong',
				attempted: result.move.san,
				expected: children.map((c) => c.san)
			};
			// Revert the visual move
			setTimeout(() => {
				boardApi?.set({ fen: trail.chess.fen(), turnColor: toMove });
			}, 300);
		}
	}

	function showAnswer() {
		if (!children.length) return;
		hintShown = true;
		const child = children[0];
		const probe = trail.chess.moves({ verbose: true }).find((m) => m.san === child.san);
		if (probe && boardApi) {
			boardApi.setAutoShapes([
				{
					orig: probe.from as Key,
					dest: probe.to as Key,
					brush: 'green'
				}
			]);
		}
	}

	function playShownMove() {
		if (!children.length) return;
		const child = children[0];
		const probe = trail.chess.moves({ verbose: true }).find((m) => m.san === child.san);
		if (!probe) return;
		handleUserMove(probe.from as Key, probe.to as Key);
	}

	$effect(() => {
		if (!hintShown && boardApi) {
			boardApi.setAutoShapes([]);
		}
	});

	const currentComment = $derived.by(() => {
		if (status.kind === 'correct') return status.node.comment;
		const last = trail.nodes[trail.nodes.length - 1];
		return last?.comment;
	});
</script>

<div class="trainer">
	<header class="header">
		<div class="title-row">
			<h1>Opening Trainer</h1>
			{#if repertoires.length > 1}
				<select class="rep-picker" onchange={handleRepertoireChange} value={selected.id}>
					{#each repertoires as r}
						<option value={r.id}>{r.name}</option>
					{/each}
				</select>
			{/if}
		</div>
		<p class="description">{selected.description ?? ''}</p>
		<div class="side-tag">
			You play <strong>{selected.color}</strong>
		</div>
	</header>

	<div class="board-container">
		<Board
			{fen}
			{orientation}
			turnColor={toMove}
			{lastMove}
			{dests}
			{movable}
			onMove={handleUserMove}
			onReady={(api) => (boardApi = api)}
		/>
	</div>

	<div
		class="status"
		class:status-correct={status.kind === 'correct'}
		class:status-wrong={status.kind === 'wrong'}
		class:status-complete={status.kind === 'line-complete'}
	>
		{#if status.kind === 'awaiting-user'}
			<div class="prompt">
				{#if usersTurn}
					Your move. <span class="muted">({toMove} to play)</span>
				{:else}
					<span class="muted">Thinking…</span>
				{/if}
			</div>
			{#if currentComment}
				<div class="comment">{currentComment}</div>
			{/if}
		{:else if status.kind === 'correct'}
			<div class="prompt">Good move: <strong>{status.node.san}</strong></div>
			{#if status.node.comment}
				<div class="comment">{status.node.comment}</div>
			{/if}
		{:else if status.kind === 'wrong'}
			<div class="prompt">
				Not in book: <strong>{status.attempted}</strong>.
				<span class="muted">Try again.</span>
			</div>
			<div class="comment">
				Expected: {status.expected.join(' or ')}
			</div>
		{:else if status.kind === 'line-complete'}
			<div class="prompt">Line complete — nice work.</div>
			<button class="primary" onclick={resetLine}>Next line</button>
		{/if}
	</div>

	<div class="controls">
		<button onclick={resetLine} class="secondary">Reset line</button>
		{#if status.kind !== 'line-complete' && usersTurn}
			{#if !hintShown}
				<button onclick={showAnswer} class="secondary">Show answer</button>
			{:else}
				<button onclick={playShownMove} class="secondary">Play it</button>
			{/if}
		{/if}
	</div>

	<div class="stats">
		<div class="stat">
			<span class="stat-value">{stats.linesCompleted}</span>
			<span class="stat-label">lines</span>
		</div>
		<div class="stat">
			<span class="stat-value">{stats.correctMoves}</span>
			<span class="stat-label">correct</span>
		</div>
		<div class="stat">
			<span class="stat-value">{stats.mistakes}</span>
			<span class="stat-label">mistakes</span>
		</div>
	</div>
</div>

<style>
	.trainer {
		max-width: 640px;
		margin: 0 auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		color: #1a1a1a;
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.header h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.rep-picker {
		padding: 6px 10px;
		border-radius: 6px;
		border: 1px solid rgba(0, 0, 0, 0.15);
		background: white;
		font-size: 14px;
	}

	.description {
		font-size: 13px;
		color: rgba(0, 0, 0, 0.55);
		margin: 0;
		line-height: 1.5;
	}

	.side-tag {
		font-size: 12px;
		color: rgba(0, 0, 0, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.side-tag strong {
		color: #1a1a1a;
		text-transform: capitalize;
	}

	.board-container {
		display: flex;
		justify-content: center;
	}

	.status {
		background: rgba(0, 0, 0, 0.03);
		border-radius: 10px;
		padding: 14px 16px;
		border-left: 3px solid rgba(0, 0, 0, 0.15);
		min-height: 64px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.status-correct {
		border-left-color: #00a854;
		background: rgba(0, 168, 84, 0.06);
	}

	.status-wrong {
		border-left-color: #d63031;
		background: rgba(214, 48, 49, 0.06);
	}

	.status-complete {
		border-left-color: #1677ff;
		background: rgba(22, 119, 255, 0.06);
	}

	.prompt {
		font-size: 15px;
		font-weight: 500;
	}

	.comment {
		font-size: 13px;
		color: rgba(0, 0, 0, 0.6);
		line-height: 1.5;
	}

	.muted {
		color: rgba(0, 0, 0, 0.45);
		font-weight: 400;
	}

	.controls {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	button {
		font: inherit;
		padding: 10px 16px;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		font-size: 14px;
		border: 1px solid transparent;
		transition: background 0.15s;
	}

	button.primary {
		background: #1677ff;
		color: white;
		border-color: #1677ff;
	}
	button.primary:hover {
		background: #0a60d8;
	}

	button.secondary {
		background: white;
		border-color: rgba(0, 0, 0, 0.15);
		color: #1a1a1a;
	}
	button.secondary:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.stats {
		display: flex;
		gap: 16px;
		padding-top: 8px;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.stat-value {
		font-size: 20px;
		font-weight: 700;
		color: #1a1a1a;
	}

	.stat-label {
		font-size: 11px;
		color: rgba(0, 0, 0, 0.45);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (max-width: 480px) {
		.trainer {
			padding: 12px;
		}
		.header h1 {
			font-size: 1.25rem;
		}
		.controls {
			flex-direction: row;
		}
		.controls button {
			flex: 1;
		}
	}
</style>
