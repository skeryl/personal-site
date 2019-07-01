import * as fs from 'fs';
import {PathLike} from 'fs';
import {PostSummary} from "personal-site-model";
import {compileDirectory} from "./compilation";
import * as path from "path";
import summaries from "./summaries";

const sortByTimeCreated = (a: PostSummary, b: PostSummary) => Math.sign(b.timestamp.getTime() - a.timestamp.getTime());

export class ContentDatabase {

    private readonly rawPosts = new Map<string, string>();
    private readonly compiledPosts = new Map<string, PostSummary>();
    private readonly files: string[];

    constructor(
        private readonly rootPath: PathLike = path.join(__dirname, './content/')
    ){
        this.files = fs.readdirSync(rootPath);
    }

    public async load(): Promise<void> {
        const results = await (compileDirectory(this.rootPath));
        Object.keys(results).map(fileName => {
            const compiled = results[fileName];
            const post = summaries[fileName];
            this.compiledPosts.set(post.id, post);
            this.rawPosts.set(post.id, compiled);
            console.info(`post "${post.title}" initialized.`);
        });
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
