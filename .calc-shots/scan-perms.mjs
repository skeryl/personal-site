import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const root = join(homedir(), '.claude', 'projects');
const files = [];
for (const dir of readdirSync(root)) {
	const d = join(root, dir);
	let entries;
	try {
		entries = readdirSync(d);
	} catch {
		continue;
	}
	for (const f of entries) {
		if (!f.endsWith('.jsonl')) continue;
		const p = join(d, f);
		try {
			files.push({ p, m: statSync(p).mtimeMs });
		} catch {}
	}
}
files.sort((a, b) => b.m - a.m);
const recent = files.slice(0, 50);

const counts = new Map();
const bump = (k) => counts.set(k, (counts.get(k) ?? 0) + 1);

const headOf = (seg) => {
	const tokens = seg.trim().split(/\s+/).filter(Boolean);
	let i = 0;
	while (i < tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i]) || tokens[i] === 'sudo' || tokens[i] === 'timeout')) i++;
	if (i >= tokens.length) return null;
	const cmd = tokens[i];
	const sub = tokens[i + 1] && /^[a-z0-9:._/-]+$/i.test(tokens[i + 1]) && !tokens[i + 1].startsWith('-') ? tokens[i + 1] : '';
	return sub ? `${cmd} ${sub}` : cmd;
};

for (const { p } of recent) {
	let text;
	try {
		text = readFileSync(p, 'utf8');
	} catch {
		continue;
	}
	for (const line of text.split('\n')) {
		if (!line.includes('"tool_use"')) continue;
		let obj;
		try {
			obj = JSON.parse(line);
		} catch {
			continue;
		}
		const content = obj?.message?.content;
		if (!Array.isArray(content)) continue;
		for (const c of content) {
			if (c?.type !== 'tool_use') continue;
			if (c.name === 'Bash') {
				const cmd = c.input?.command;
				if (typeof cmd !== 'string') continue;
				for (const seg of cmd.split(/&&|\|\||[;|]|\n/)) {
					const h = headOf(seg);
					if (h) bump(h);
				}
			} else if (c.name?.startsWith('mcp__')) {
				bump(c.name);
			}
		}
	}
}

const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, v] of sorted) {
	if (v >= 3) console.log(String(v).padStart(5), k);
}
