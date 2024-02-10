import { type PluginOption } from 'vite';
import { type WatchChangeHook } from 'rollup';
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

/*async function readPostFromFile(dir: string, fileName: string): Promise<Post | undefined> {
	const filePath = path.resolve(path.join(dir, fileName));
	const fileContents = await fs.readFile(filePath, 'utf-8');
	if (!fileContents) {
		return undefined;
	}

	return (loadModule(filePath, fileContents) as { default: Post }).default;
}*/

function filesCamelCaseMap(files: string[]) {
	return files.reduce(
		(res, file) => ({
			...res,
			[file]: toCamelCase(file.split('.')[0])
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
		moduleSpecifier: `$lib/entries/${file.split('.')[0]}`
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

async function doIfNotExists(file: string, sumpn: () => Promise<void>): Promise<void> {
	if (!(await doesFileExist(file))) {
		await sumpn();
	}
}

/*
*     const noteShader = import("$lib/entries/note-shader");
</script>

{#await noteShader}
    <p>post is loading</p>
{:then noteShaderPost}
    <Post post={noteShaderPost.default}/>
{:catch error}
    <p>Error! {error.message}</p>
{/await}

* */

async function generatePostPage(
	pagesDir: string,
	file: string,
	fileCamelCase: string
): Promise<void> {
	const project = new Project();
	const postId = file.split('.')[0];

	const pageFile = path.join(pagesDir, postId, '+page.svelte');
	await doIfNotExists(pageFile, async () => {
		const pageSource = project.createSourceFile(
			pageFile,
			`<script lang="ts">
	import Post from "$lib/components/PostAsync.svelte";
    const ${fileCamelCase} = import("$lib/entries/${postId}");
</script>
<Post post={${fileCamelCase}}/>
`,
			{ overwrite: true }
		);
		await pageSource.save();
	});

	const pageServerFile = path.join(pagesDir, postId, '+page.server.ts');
	await doIfNotExists(pageServerFile, async () => {
		await project
			.createSourceFile(pageServerFile, `export const prerender = true;`, {
				overwrite: true
			})
			.save();
	});
}

async function generatePostPages(pagesDir: string, files: string[]) {
	const fileCamelCase: Record<string, string> = filesCamelCaseMap(files);
	return Promise.all(files.map((p) => generatePostPage(pagesDir, p, fileCamelCase[p])));
}

export default async function postSummarizer({
	entriesDir,
	pagesDir
}: PostSummarizerOptions): Promise<PluginOption> {
	const dir = path.resolve(entriesDir);
	const pagesDirAbsolute = path.resolve(pagesDir);
	const indexPath = path.resolve(path.join(dir, 'index.ts'));
	const svelteKitPath = path.resolve(__dirname, '../.svelte-kit/');

	const watchChange = async function (id?: string) {
		if (id === indexPath || id?.startsWith(pagesDirAbsolute) || id?.startsWith(svelteKitPath)) {
			return;
		}
		const files = (await fs.readdir(dir)).filter((f) => f !== 'index.ts');

		await generateIndexImports(indexPath, files);
		await generatePostPages(pagesDirAbsolute, files);
	};

	await watchChange();
	console.log('Initialized post-summarizer and successfully generated artifacts!');

	return {
		name: 'post-summarizer',
		watchChange
	};
}
