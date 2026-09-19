/*
 * The textual twin of the builder: a small expression language that prints
 * from and parses to the same AST the WYSIWYG editor edits. `_` marks an
 * empty slot so partial trees round-trip. The invariant the spec leans on:
 * parse(print(tree)) is structurally identical to tree.
 */

import type { CalcNode, MapNode, OpNode, SwitchNode } from './ast';
import type { OperatorId } from './operators';

export type ParseResult =
	| { ok: true; root: CalcNode | null }
	| { ok: false; error: string; position: number };

/* ── Printing ──────────────────────────────────────────────────── */

const LEVEL = { or: 1, and: 2, not: 3, cmp: 4, add: 5, mul: 6, primary: 7 } as const;

const CMP_SYMBOL: Partial<Record<OperatorId, string>> = {
	gt: '>',
	gte: '>=',
	lt: '<',
	lte: '<=',
	eq: '==',
	neq: '!='
};

const FN_NAME: Partial<Record<OperatorId, string>> = {
	sum: 'sum',
	avg: 'avg',
	min: 'min',
	max: 'max',
	count: 'count',
	pluck: 'pluck',
	lookupString: 'lookupText',
	lookupNumber: 'lookupNumber'
};

const opLevel = (op: OperatorId): number => {
	if (op === 'or') return LEVEL.or;
	if (op === 'and') return LEVEL.and;
	if (op === 'not') return LEVEL.not;
	if (CMP_SYMBOL[op]) return LEVEL.cmp;
	if (op === 'add' || op === 'sub') return LEVEL.add;
	if (op === 'mul' || op === 'div') return LEVEL.mul;
	return LEVEL.primary;
};

const printNode = (node: CalcNode | null, minLevel: number): string => {
	if (node === null) return '_';
	switch (node.kind) {
		case 'literal':
			return typeof node.value === 'string' ? JSON.stringify(node.value) : String(node.value);
		case 'field':
			return node.field;
		case 'calc':
			return `@${node.calcId}`;
		case 'map':
			return `map(${printNode(node.source, LEVEL.or)}, ${printNode(node.body, LEVEL.or)})`;
		case 'switch': {
			const cases = node.cases
				.map(
					(branch) =>
						` when ${printNode(branch.when, LEVEL.or)} then ${printNode(branch.then, LEVEL.or)}`
				)
				.join('');
			const fallback = node.fallback === null ? '' : ` else ${printNode(node.fallback, LEVEL.or)}`;
			return `case ${printNode(node.on, LEVEL.or)}${cases}${fallback} end`;
		}
		case 'op':
			return printOp(node, minLevel);
	}
};

const wrap = (text: string, level: number, minLevel: number): string =>
	level < minLevel ? `(${text})` : text;

const printOp = (node: OpNode, minLevel: number): string => {
	const level = opLevel(node.op);
	const fn = FN_NAME[node.op];
	if (fn) {
		return `${fn}(${node.inputs.map((input) => printNode(input, LEVEL.or)).join(', ')})`;
	}
	if (node.op === 'not') {
		return wrap(`not ${printNode(node.inputs[0] ?? null, LEVEL.not)}`, level, minLevel);
	}
	if (node.op === 'and' || node.op === 'or') {
		const joined = node.inputs.map((input) => printNode(input, level + 1)).join(` ${node.op} `);
		return wrap(joined, level, minLevel);
	}
	const symbol = CMP_SYMBOL[node.op];
	if (symbol) {
		const [a, b] = node.inputs;
		return wrap(
			`${printNode(a ?? null, LEVEL.add)} ${symbol} ${printNode(b ?? null, LEVEL.add)}`,
			level,
			minLevel
		);
	}
	if (node.op === 'add' || node.op === 'mul') {
		const joined = node.inputs
			.map((input) => printNode(input, level + 1))
			.join(node.op === 'add' ? ' + ' : ' * ');
		return wrap(joined, level, minLevel);
	}
	// sub / div: left-associative binary, right operand binds tighter.
	const [a, b] = node.inputs;
	const symbolBin = node.op === 'sub' ? '-' : '/';
	return wrap(
		`${printNode(a ?? null, level)} ${symbolBin} ${printNode(b ?? null, level + 1)}`,
		level,
		minLevel
	);
};

/** Empty trees print as '' so the bar can show its placeholder. */
export const printCalc = (root: CalcNode | null): string =>
	root === null ? '' : printNode(root, LEVEL.or);

/* ── Tokenizing ────────────────────────────────────────────────── */

type Token =
	| { kind: 'num'; value: number; pos: number }
	| { kind: 'str'; value: string; pos: number }
	| { kind: 'ident'; value: string; pos: number }
	| { kind: 'calcref'; value: string; pos: number }
	| { kind: 'kw'; value: string; pos: number }
	| { kind: 'sym'; value: string; pos: number }
	| { kind: 'eof'; pos: number };

const KEYWORDS = new Set([
	'case',
	'when',
	'then',
	'else',
	'end',
	'and',
	'or',
	'not',
	'true',
	'false'
]);

class ParseError extends Error {
	constructor(
		message: string,
		readonly position: number
	) {
		super(message);
	}
}

const tokenize = (text: string): Token[] => {
	const tokens: Token[] = [];
	let i = 0;
	while (i < text.length) {
		const ch = text[i];
		if (/\s/.test(ch)) {
			i++;
			continue;
		}
		if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(text[i + 1] ?? ''))) {
			const match = /^[0-9]*\.?[0-9]+/.exec(text.slice(i))!;
			tokens.push({ kind: 'num', value: Number(match[0]), pos: i });
			i += match[0].length;
			continue;
		}
		if (/[A-Za-z_]/.test(ch)) {
			const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(text.slice(i))!;
			const word = match[0];
			if (word === '_' && match[0].length === 1) {
				tokens.push({ kind: 'sym', value: '_', pos: i });
			} else {
				tokens.push({ kind: KEYWORDS.has(word) ? 'kw' : 'ident', value: word, pos: i });
			}
			i += word.length;
			continue;
		}
		if (ch === '@') {
			const match = /^[A-Za-z0-9_.-]+/.exec(text.slice(i + 1));
			if (!match) throw new ParseError('Expected a calc id after "@"', i);
			tokens.push({ kind: 'calcref', value: match[0], pos: i });
			i += 1 + match[0].length;
			continue;
		}
		if (ch === '"') {
			let value = '';
			let j = i + 1;
			while (j < text.length && text[j] !== '"') {
				if (text[j] === '\\' && j + 1 < text.length) {
					value += text[j + 1];
					j += 2;
				} else {
					value += text[j];
					j++;
				}
			}
			if (j >= text.length) throw new ParseError('Unterminated string', i);
			tokens.push({ kind: 'str', value, pos: i });
			i = j + 1;
			continue;
		}
		const two = text.slice(i, i + 2);
		if (two === '>=' || two === '<=' || two === '==' || two === '!=') {
			tokens.push({ kind: 'sym', value: two, pos: i });
			i += 2;
			continue;
		}
		if ('()+-*/<>,'.includes(ch)) {
			tokens.push({ kind: 'sym', value: ch, pos: i });
			i++;
			continue;
		}
		throw new ParseError(`Unexpected character "${ch}"`, i);
	}
	tokens.push({ kind: 'eof', pos: text.length });
	return tokens;
};

/* ── Parsing ───────────────────────────────────────────────────── */

const CMP_OPS: Record<string, OperatorId> = {
	'>': 'gt',
	'>=': 'gte',
	'<': 'lt',
	'<=': 'lte',
	'==': 'eq',
	'!=': 'neq'
};

const FN_ARITY: Record<string, { op: OperatorId; min: number; exact: boolean }> = {
	sum: { op: 'sum', min: 1, exact: false },
	avg: { op: 'avg', min: 1, exact: false },
	min: { op: 'min', min: 1, exact: false },
	max: { op: 'max', min: 1, exact: false },
	count: { op: 'count', min: 1, exact: false },
	pluck: { op: 'pluck', min: 2, exact: true },
	lookupText: { op: 'lookupString', min: 4, exact: true },
	lookupNumber: { op: 'lookupNumber', min: 4, exact: true }
};

class Parser {
	private index = 0;
	constructor(private tokens: Token[]) {}

	private peek(): Token {
		return this.tokens[this.index];
	}

	private take(): Token {
		return this.tokens[this.index++];
	}

	private atSym(value: string): boolean {
		const token = this.peek();
		return token.kind === 'sym' && token.value === value;
	}

	private atKw(value: string): boolean {
		const token = this.peek();
		return token.kind === 'kw' && token.value === value;
	}

	private expectSym(value: string): void {
		if (!this.atSym(value)) throw new ParseError(`Expected "${value}"`, this.peek().pos);
		this.take();
	}

	private expectKw(value: string): void {
		if (!this.atKw(value)) throw new ParseError(`Expected "${value}"`, this.peek().pos);
		this.take();
	}

	parse(): CalcNode | null {
		if (this.peek().kind === 'eof') return null;
		const node = this.expr();
		const trailing = this.peek();
		if (trailing.kind !== 'eof') throw new ParseError('Unexpected trailing input', trailing.pos);
		return node;
	}

	private expr(): CalcNode | null {
		return this.orExpr();
	}

	private variadic(
		op: OperatorId,
		next: () => CalcNode | null,
		matches: () => boolean
	): CalcNode | null {
		let first = next();
		while (matches()) {
			this.take();
			const inputs: (CalcNode | null)[] = [first, next()];
			while (matches()) {
				this.take();
				inputs.push(next());
			}
			first = { kind: 'op', op, inputs };
		}
		return first;
	}

	private orExpr(): CalcNode | null {
		return this.variadic(
			'or',
			() => this.andExpr(),
			() => this.atKw('or')
		);
	}

	private andExpr(): CalcNode | null {
		return this.variadic(
			'and',
			() => this.notExpr(),
			() => this.atKw('and')
		);
	}

	private notExpr(): CalcNode | null {
		if (this.atKw('not')) {
			this.take();
			return { kind: 'op', op: 'not', inputs: [this.notExpr()] };
		}
		return this.comparison();
	}

	private comparison(): CalcNode | null {
		const left = this.additive();
		const token = this.peek();
		if (token.kind === 'sym' && CMP_OPS[token.value]) {
			this.take();
			return { kind: 'op', op: CMP_OPS[token.value], inputs: [left, this.additive()] };
		}
		return left;
	}

	private chain(
		ops: Record<string, 'variadic' | 'binary'>,
		variadicOp: OperatorId,
		binaryOp: OperatorId,
		next: () => CalcNode | null
	): CalcNode | null {
		let node = next();
		for (;;) {
			const token = this.peek();
			if (token.kind !== 'sym' || !(token.value in ops)) return node;
			const mode = ops[token.value];
			this.take();
			if (mode === 'binary') {
				node = { kind: 'op', op: binaryOp, inputs: [node, next()] };
				continue;
			}
			const inputs: (CalcNode | null)[] = [node, next()];
			while (
				this.peek().kind === 'sym' &&
				ops[(this.peek() as { value: string }).value] === 'variadic'
			) {
				this.take();
				inputs.push(next());
			}
			node = { kind: 'op', op: variadicOp, inputs };
		}
	}

	private additive(): CalcNode | null {
		return this.chain({ '+': 'variadic', '-': 'binary' }, 'add', 'sub', () =>
			this.multiplicative()
		);
	}

	private multiplicative(): CalcNode | null {
		return this.chain({ '*': 'variadic', '/': 'binary' }, 'mul', 'div', () => this.unary());
	}

	private unary(): CalcNode | null {
		if (this.atSym('-')) {
			const minus = this.take();
			const token = this.peek();
			if (token.kind !== 'num') throw new ParseError('Expected a number after "-"', minus.pos);
			this.take();
			return { kind: 'literal', type: 'number', value: -token.value };
		}
		return this.primary();
	}

	private primary(): CalcNode | null {
		const token = this.peek();
		if (token.kind === 'num') {
			this.take();
			return { kind: 'literal', type: 'number', value: token.value };
		}
		if (token.kind === 'str') {
			this.take();
			return { kind: 'literal', type: 'string', value: token.value };
		}
		if (token.kind === 'kw' && (token.value === 'true' || token.value === 'false')) {
			this.take();
			return { kind: 'literal', type: 'boolean', value: token.value === 'true' };
		}
		if (token.kind === 'sym' && token.value === '_') {
			this.take();
			return null;
		}
		if (token.kind === 'calcref') {
			this.take();
			return { kind: 'calc', calcId: token.value };
		}
		if (token.kind === 'sym' && token.value === '(') {
			this.take();
			const node = this.expr();
			this.expectSym(')');
			return node;
		}
		if (token.kind === 'kw' && token.value === 'case') return this.caseExpr();
		if (token.kind === 'ident') {
			this.take();
			if (this.atSym('(')) return this.call(token.value, token.pos);
			return { kind: 'field', field: token.value };
		}
		throw new ParseError('Expected an expression', token.pos);
	}

	private call(name: string, pos: number): CalcNode {
		this.expectSym('(');
		const args: (CalcNode | null)[] = [];
		if (!this.atSym(')')) {
			args.push(this.expr());
			while (this.atSym(',')) {
				this.take();
				args.push(this.expr());
			}
		}
		this.expectSym(')');
		if (name === 'map') {
			if (args.length !== 2) throw new ParseError('map takes 2 arguments', pos);
			const node: MapNode = { kind: 'map', source: args[0], body: args[1] };
			return node;
		}
		const fn = FN_ARITY[name];
		if (!fn) throw new ParseError(`Unknown function "${name}"`, pos);
		if (fn.exact && args.length !== fn.min)
			throw new ParseError(`${name} takes ${fn.min} argument${fn.min === 1 ? '' : 's'}`, pos);
		if (!fn.exact && args.length < fn.min)
			throw new ParseError(
				`${name} takes at least ${fn.min} argument${fn.min === 1 ? '' : 's'}`,
				pos
			);
		return { kind: 'op', op: fn.op, inputs: args };
	}

	private caseExpr(): SwitchNode {
		this.expectKw('case');
		const on = this.expr();
		const cases: SwitchNode['cases'] = [];
		while (this.atKw('when')) {
			this.take();
			const when = this.expr();
			this.expectKw('then');
			cases.push({ when, then: this.expr() });
		}
		if (cases.length === 0) throw new ParseError('case needs at least one "when"', this.peek().pos);
		let fallback: CalcNode | null = null;
		if (this.atKw('else')) {
			this.take();
			fallback = this.expr();
		}
		this.expectKw('end');
		return { kind: 'switch', on, cases, fallback };
	}
}

export const parseCalc = (text: string): ParseResult => {
	try {
		const root = new Parser(tokenize(text)).parse();
		return { ok: true, root };
	} catch (error) {
		if (error instanceof ParseError) {
			return { ok: false, error: error.message, position: error.position };
		}
		throw error;
	}
};

/** Structural equality, used to decide whether applying a parse is a change. */
export const nodesEqual = (a: CalcNode | null, b: CalcNode | null): boolean =>
	JSON.stringify(a) === JSON.stringify(b);
