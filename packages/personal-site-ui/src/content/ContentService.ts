import { Post, PostSummary } from "personal-site-model";

export class ContentService {
  constructor() {}

  async getPost(id: string): Promise<Post | undefined> {
    try {
      const post = await import(`./posts/${id}`);
      console.log("post: ", post);
      return post.default as Post;
    } catch (e) {
      console.error("failed to load post.");
      return undefined;
    }
  }

  /*async getLatestPost(): Promise<Post> {
    const response = await fetch(`/api/posts?latest`);
    const rawJson = await response.json();
    const summary = rawJson as PostSummary;

    return await this.getPost(summary.id);
  }*/

  async listPosts(): Promise<PostSummary[]> {
    const response = await fetch(`/api/posts`);
    const rawJson = await response.json();
    return rawJson.map((rawSummary: any) => {
      return { ...rawSummary, timestamp: new Date(rawSummary.timestamp) };
    }) as PostSummary[];
  }
}
