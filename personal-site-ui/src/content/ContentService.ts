import {Post, PostSummary} from "personal-site-model";

export class ContentService {

    constructor(){
    }

    async getPost(id: string): Promise<Post> {
        const response = await fetch(`/api/posts/${id}`);
        const rawJs = await (response.text());
        let exports: any = {};
        (function(this: any, ex: any){
            (window as any).exports = {};
            eval(rawJs);
        }).call({ /*exports: {}*/ }, exports);
        return exports.default as Post;
    }

    async getLatestPost(): Promise<Post> {
        const response = await fetch(`/api/posts?latest`);
        const rawJson = await (response.json());
        const summary = rawJson as PostSummary;

        return await (this.getPost(summary.id));
    }

    async listPosts(): Promise<PostSummary[]> {
        const response = await fetch(`/api/posts`);
        const rawJson = await (response.json());
        return (rawJson.map((rawSummary: any) => {
            return {...rawSummary, timestamp: new Date(rawSummary.timestamp) };
        })) as PostSummary[];
    }
}