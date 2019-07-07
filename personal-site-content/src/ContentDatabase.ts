import {PathLike} from 'fs';
import {PostSummary} from "personal-site-model";
import {compileDirectory, CompilationOutput, watchDirectory} from "./compilation";
import * as path from "path";

const sortByTimeCreated = (a: PostSummary, b: PostSummary) => Math.sign(b.timestamp.getTime() - a.timestamp.getTime());

async function getSummary(fileName: string): Promise<PostSummary> {
    const post = await (import (`./content/${fileName}`));
    return post.default.summary;
}

export class ContentDatabase {

    private readonly rawPosts = new Map<string, string>();
    private readonly compiledPosts = new Map<string, PostSummary>();

    constructor(
        private readonly rootPath: PathLike = path.join(__dirname, './content/')
    ){
    }

    private async setResults(results: CompilationOutput) {
        const promises = Object.keys(results).map(async fileName => {
            const compiled = results[fileName];
            const post: PostSummary = await getSummary(fileName);
            this.compiledPosts.set(post.id, post);
            this.rawPosts.set(post.id, compiled);
            console.info(`post "${post.title}" initialized.`);
        });
        await Promise.all(promises);
    }

    public async load(): Promise<void> {
        try {
            const results = await (compileDirectory(this.rootPath));
            await this.setResults(results.outputs);
            if(results.error){
                console.error("error occurred during compilation!", results.error);
            }
        } catch (e) {
            console.error('error occurred during compilation!', e);
        }
    }

    public watch(): void {
        watchDirectory(this.rootPath, (results => {
            this.setResults(results.outputs);
            if(results.error){
                console.error("error on watch: ", results.error);
            }
        }));
    }

    public getPostJS = (id: string): string | undefined => {
        return this.rawPosts.get(id);
    };

    public listSummaries = (): PostSummary[] => {
        return Array.from<PostSummary>(this.compiledPosts.values()).sort(sortByTimeCreated);
    };

    public latest = (): PostSummary => {
        return Array.from<PostSummary>(this.compiledPosts.values())
            .sort(sortByTimeCreated)
            [0];
    }
}
