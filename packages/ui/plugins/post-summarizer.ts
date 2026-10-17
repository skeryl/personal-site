import { type PluginOption } from 'vite';
import fs from 'fs/promises';
import path from 'path';
import {
	type ImportDeclarationStructure,
	type OptionalKind,
	Project,
	StructureKind,
	VariableDeclarationKind
} from 'ts-morph';

export interface PostSummarizerOptions {
	entriesDir: string;
	pagesDir: string;
	videosDir: string;
}

export function capitalize(part: string): string {
	if (!part || !part.length) {
		return part;
	}
	return `${part[0].toUpperCase()}${part.slice(1)}`;
}

export function toCamelCase(fileName: string): string {
	return fileName
		.split('-')
		.map((part, ix) => (ix > 0 ? capitalize(part) : part))
		.join('');
}

function noExt(fileName: string): string {
	return fileName.split('.')[0];
}

function filesCamelCaseMap(files: string[]) {
	return files.reduce(
		(res, file) => ({
			...res,
			[file]: toCamelCase(noExt(file))
		}),
		{}
	);
}

async function generateIndexImports(indexPath: string, files: string[]) {
	const proj = new Project();
	const sourceFile = proj.createSourceFile(indexPath, undefined, { overwrite: true });

	sourceFile.addStatements(
		`/** This file was generated automatically by a script. Do not modify this file manually. */`
	);

	const fileCamelCase: Record<string, string> = filesCamelCaseMap(files);

	const importDeclarations: OptionalKind<ImportDeclarationStructure>[] = files.map((file) => ({
		defaultImport: fileCamelCase[file],
		moduleSpecifier: `$lib/entries/${noExt(file)}`
	}));

	sourceFile.addImportDeclarations(importDeclarations);

	/*
    const posts = {
        [antFarm.summary.id]: antFarm
        ...
    };
    * */
	sourceFile.addVariableStatement({
		kind: StructureKind.VariableStatement,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: 'posts',
				initializer: `{
					${files.map((file) => `[${fileCamelCase[file]}.summary.id]: ${fileCamelCase[file]}`).join(',\n')}
}`
			}
		]
	});

	sourceFile.addExportAssignment({
		isExportEquals: false,
		expression: 'posts'
	});

	sourceFile.formatText();
	await sourceFile.save();
}

async function doesFileExist(file: string): Promise<boolean> {
	try {
		await fs.stat(file);
		return true;
	} catch {
		return false;
	}
}

/**
 * Generated pages are gitignored, so rewriting a stale one loses nothing.
 * Unchanged files are left alone to keep the dev server from rebuilding in a
 * loop.
 */
export async function writeIfChanged(file: string, content: string): Promise<void> {
	if ((await doesFileExist(file)) && (await fs.readFile(file, 'utf8')) === content) {
		return;
	}
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, content);
}

/**
 * The page for one post. The entry is imported statically so that the post
 * renders into the prerendered HTML rather than arriving after hydration.
 */
export function postPageSource(postId: string, fileCamelCase: string): string {
	return `<script lang="ts">
	import Post from '$lib/components/Post.svelte';
	import ${fileCamelCase} from '$lib/entries/${postId}';
</script>

<Post post={${fileCamelCase}} />
`;
}

async function generatePostPage(
	pagesDir: string,
	file: string,
	fileCamelCase: string
): Promise<void> {
	const postId = noExt(file);
	await writeIfChanged(
		path.join(pagesDir, postId, '+page.svelte'),
		postPageSource(postId, fileCamelCase)
	);
}

async function generatePostPages(pagesDir: string, files: string[]) {
	const fileCamelCase: Record<string, string> = filesCamelCaseMap(files);
	return Promise.all(files.map((p) => generatePostPage(pagesDir, p, fileCamelCase[p])));
}

async function generateVideoSummary(dir: string) {
	const videosDir = path.resolve(dir);

	const postVideoNames = (await fs.readdir(videosDir)).filter((f) => f !== 'index.ts');
	// const postVideos = postVideoNames.map((v) => path.join(videosDir, v));

	const proj = new Project();

	const sourceFile = proj.createSourceFile(path.join(videosDir, 'index.ts'), undefined, {
		overwrite: true
	});

	const fileCamelCase: Record<string, string> = filesCamelCaseMap(postVideoNames);

	sourceFile.addImportDeclarations(
		postVideoNames.map(
			(v) =>
				({
					defaultImport: fileCamelCase[v],
					moduleSpecifier: `$lib/assets/videos/posts/${v}`
				}) as ImportDeclarationStructure
		)
	);

	/*
	*
	*
	export const videos = {
		["ant-farm"]: antFarm,
		...
	};
	*
	* */
	sourceFile.addVariableStatement({
		kind: StructureKind.VariableStatement,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: 'videos',
				initializer: `{
					${postVideoNames.map((file) => `["${noExt(file)}"]: ${fileCamelCase[file]}`).join(',\n')}
}`,
				type: (writer) => writer.write('Record<string, string>')
			}
		]
	});

	sourceFile.addExportAssignment({
		isExportEquals: false,
		expression: 'videos'
	});

	sourceFile.formatText();

	await sourceFile.save();
}

export default async function postSummarizer({
	entriesDir,
	pagesDir,
	videosDir
}: PostSummarizerOptions): Promise<PluginOption> {
	const dir = path.resolve(entriesDir);
	const pagesDirAbsolute = path.resolve(pagesDir);
	const indexPath = path.resolve(path.join(dir, 'index.ts'));
	const svelteKitPath = path.resolve(__dirname, '../.svelte-kit/');

	const watchChange = async function (id?: string) {
		if (
			id === indexPath ||
			id?.startsWith(pagesDirAbsolute) ||
			id?.startsWith(svelteKitPath) ||
			id?.endsWith('assets/videos/posts/index.ts')
		) {
			return;
		}
		const files = (await fs.readdir(dir)).filter((f) => f !== 'index.ts');

		await generateIndexImports(indexPath, files);
		await generatePostPages(pagesDirAbsolute, files);
		await generateVideoSummary(videosDir);
	};

	await watchChange();
	console.log('Initialized post-summarizer and successfully generated artifacts!');

	return {
		name: 'post-summarizer',
		watchChange
	};
}
