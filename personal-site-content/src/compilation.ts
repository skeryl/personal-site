import {PathLike} from "fs";
import {Configuration} from "webpack";
import webpack = require('webpack');
import MemoryFileSystem = require("memory-fs");
import * as ts from 'typescript';
import * as fs from "fs";
import * as path from "path";

const baseWebpackConfig: Configuration = {
    mode: 'development',
    output: {
        libraryTarget: 'commonjs',
        filename: '[name]',
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
                    /\.(spec)\.ts$/,
                    /node_modules/
                ]
            },
        ]
    }
};

type StringObject = { [key: string]: string };

function getFileKey(fileName: string): string {
    return fileName.split('.').slice(0, -1).join('.');
}

export function compileDirectory(dir: PathLike): Promise<StringObject>{
    const fileNames = fs.readdirSync(dir);
    const entry = fileNames.reduce(
        (res: StringObject, fileName) => {
            res[`/build/${getFileKey(fileName)}.js`] = path.join(dir.toString(), fileName);
                return res;
            },
        {}
    );
    return new Promise<StringObject>((resolve, reject) => {
        const compiler = webpack({
            ...baseWebpackConfig,
            entry: entry,
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
                    try {
                        const outputs = fileNames.reduce((res: StringObject, file: string) => {
                            res[file] = compilation.assets[`/build/${getFileKey(file)}.js`].source();
                            return res;
                        }, {});

                        resolve(outputs);
                    } catch (e) {
                        reject(e);
                    }
                }
            }
        });
    });
}
