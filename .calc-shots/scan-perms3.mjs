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

const counts = new Map();
const bump = (k) => counts.set(k, (counts.get(k) ?? 0) + 1);

for (const { p } of files.slice(0, 50)) {
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
			if (c?.type !== 'tool_use' || c.name !== 'Bash') continue;
			const cmd = c.input?.command;
			if (typeof cmd !== 'string') continue;
			const firstLine = cmd.split('\n')[0];
			for (const seg of firstLine.split(/&&|\|\||[;|]/)) {
				const t = seg.trim().split(/\s+/).filter(Boolean);
				if (!t.length) continue;
				if (t[0] === 'npm' && t[1] === 'run') bump(`npm run ${t[2] ?? ''}`);
				if (t[0] === 'node') bump(`node ${t[1] ?? ''}`);
				if (t[0] === 'curl') bump(t.slice(0, 5).join(' '));
				if (t[0] === 'npx') bump(`npx ${t[1] ?? ''} ${t[2] ?? ''}`);
			}
		}
	}
}

for (const [k, v] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
	if (v >= 2) console.log(String(v).padStart(5), k);
}
