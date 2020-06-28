import * as fs from "fs";
import { PathLike } from "fs";
import { Configuration, Stats } from "webpack";
import * as ts from "typescript";
import * as path from "path";
import webpack = require("webpack");
import MemoryFileSystem = require("memory-fs");

const baseWebpackConfig: Configuration = {
  output: {
    libraryTarget: "commonjs",
    filename: "[name]",
  },
  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      {
        test: /\.tsx?$/,
        loader: "awesome-typescript-loader",
        options: {
          configFileName: __dirname + "/../tsconfig.json",
        },
        exclude: [/\.(spec)\.ts$/, /node_modules/],
      },
    ],
  },
};

export type CompilationOutput = { [key: string]: string };

export interface CompilationResults {
  error?: string | Error;
  outputs: CompilationOutput;
}

export type ResultHandler = (results: CompilationResults) => void;

function getFileKey(fileName: string): string {
  return fileName.split(".").slice(0, -1).join(".");
}

function getWebPackEntry(fileNames: string[], dir: PathLike) {
  return fileNames.reduce((res: CompilationOutput, fileName) => {
    res[`/build/${getFileKey(fileName)}.js`] = path.join(
      dir.toString(),
      fileName,
    );
    return res;
  }, {});
}

function collectResults(err: Error, stats: Stats, fileNames: string[]) {
  const results: CompilationResults = { outputs: {} };
  if (err) {
    results.error = err;
  } else {
    const { compilation } = stats;
    if (compilation.errors.length) {
      results.error = compilation.errors.join("\n\n");
    } else {
      try {
        results.outputs = fileNames.reduce(
          (res: CompilationOutput, file: string) => {
            res[file] = compilation.assets[
              `/build/${getFileKey(file)}.js`
            ].source();
            return res;
          },
          {},
        );
      } catch (e) {
        results.error = e;
      }
    }
  }
  return results;
}

export function compileDirectory(dir: PathLike): Promise<CompilationResults> {
  const fileNames = fs.readdirSync(dir);
  const entry = fileNames.reduce((res: CompilationOutput, fileName) => {
    res[`/build/${getFileKey(fileName)}.js`] = path.join(
      dir.toString(),
      fileName,
    );
    return res;
  }, {});
  return new Promise<CompilationResults>((resolve, reject) => {
    const compiler = webpack({
      ...baseWebpackConfig,
      entry: entry,
    });

    const memFs = new MemoryFileSystem();
    memFs.mkdirSync("/");
    compiler.outputFileSystem = memFs;
    compiler.run((err, stats) => {
      resolve(collectResults(err, stats, fileNames));
    });
  });
}

export function watchDirectory(dir: PathLike, handler: ResultHandler): void {
  const fileNames = fs.readdirSync(dir);

  const entry = getWebPackEntry(fileNames, dir);
  const compiler = webpack({
    ...baseWebpackConfig,
    mode: "development",
    entry: entry,
  });

  const memFs = new MemoryFileSystem();
  memFs.mkdirSync("/");
  compiler.outputFileSystem = memFs;
  compiler.watch({}, (err, stats) => {
    handler(collectResults(err, stats, fileNames));
  });
}
