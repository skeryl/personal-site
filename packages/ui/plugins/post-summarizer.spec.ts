import { describe, test, expect } from 'vitest';
import fs from 'fs/promises';
import os from 'node:os';
import path from 'node:path';
import { capitalize, postPageSource, toCamelCase, writeIfChanged } from './post-summarizer';

describe('post-summarizer', () => {
	describe('capitalize', () => {
		test('should capitalize a word', () => {
			expect(capitalize('test')).toEqual('Test');
		});
	});

	describe('toCamelCase', () => {
		test('should camelCase a kebab string', () => {
			expect(toCamelCase('ant-farm')).toEqual('antFarm');
		});
		test('should camelCase a kebab filename (without stripping extension)', () => {
			expect(toCamelCase('ant-farm.ts')).toEqual('antFarm.ts');
		});
	});

	describe('postPageSource', () => {
		test('imports the entry statically so the post is prerendered', () => {
			const source = postPageSource('ant-farm', 'antFarm');
			expect(source).toContain("import antFarm from '$lib/entries/ant-farm';");
			expect(source).toContain('<Post post={antFarm} />');
			// A dynamic import would leave the built page empty until hydration.
			expect(source).not.toMatch(/import\(/);
		});
	});

	describe('writeIfChanged', () => {
		test('writes a new file, creating its directory', async () => {
			const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'summarizer-'));
			const file = path.join(dir, 'nested', '+page.svelte');

			await writeIfChanged(file, 'hello');

			expect(await fs.readFile(file, 'utf8')).toEqual('hello');
		});

		test('leaves an unchanged file untouched so dev does not rebuild in a loop', async () => {
			const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'summarizer-'));
			const file = path.join(dir, '+page.svelte');
			await writeIfChanged(file, 'hello');
			const { mtimeMs } = await fs.stat(file);

			await writeIfChanged(file, 'hello');

			expect((await fs.stat(file)).mtimeMs).toEqual(mtimeMs);
		});

		test('replaces a stale file', async () => {
			const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'summarizer-'));
			const file = path.join(dir, '+page.svelte');
			await writeIfChanged(file, 'old');

			await writeIfChanged(file, 'new');

			expect(await fs.readFile(file, 'utf8')).toEqual('new');
		});
	});
});
