import {PathLike} from "fs";
import {Configuration} from "webpack";
import webpack = require('webpack');
import MemoryFileSystem = require("memory-fs");

import * as ts from 'typescript';
import * as fs from "fs";
import {CompilerOptions} from 'typescript';

const OUTPUT_FILE = 'output.js';

const baseWebpackConfig: Configuration = {
    mode: 'development',
    output: {
        libraryTarget: 'commonjs',
        filename: OUTPUT_FILE,
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },
    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
                test: /\.tsx?$/,
                loader: "awesome-typescript-loader",
                options: {
                    configFileName: __dirname + '/../tsconfig.json'
                },
                exclude: [
                    /\.(spec)\.ts$/
                ]
            },
        ]
    }
};

const defaultOptions: CompilerOptions = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2016,
    lib: ["dom", "es2018"],
    esModuleInterop: true,
    jsx: ts.JsxEmit.React
};

export function compileTypescript(path: PathLike, options: CompilerOptions = defaultOptions): Promise<string> {
    const contents = fs.readFileSync(path);
    const compiled = ts.transpileModule(contents.toString(), { compilerOptions: options });
    return Promise.resolve(compiled.outputText);
}

export function compileWebpack(path: PathLike): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const compiler = webpack({
            ...baseWebpackConfig,
            entry: path.toString(),
        });

        const memFs = new MemoryFileSystem();
        memFs.mkdirSync('/');
        compiler.outputFileSystem = memFs;
        compiler.run((err, stats) => {
            if(err){
                reject(err);
            } else {
                const { compilation } = stats;

                if (compilation.errors.length) {
                    const errorMessage = compilation.errors.join('\n\n');
                    reject(errorMessage);
                } else {
                    const outputFile = compilation.assets[OUTPUT_FILE];

                    if(!outputFile){
                        reject(`failed to find output file in file system. assets: ${compilation.assets}`);
                        return;
                    }

                    try {
                        resolve(outputFile.source());
                    } catch (e) {
                        reject(e);
                    }
                }
            }
        });
    });
}
