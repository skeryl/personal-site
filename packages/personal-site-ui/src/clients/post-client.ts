import { Post, PostSummary, PostType } from "personal-site-model";

const artTypes = new Set<PostType>([
  PostType.experiment,
  PostType.experiment3d,
]);

export function postTypeToUrlPrefix(postType: PostType): string {
  return artTypes.has(postType) ? "art" : postType;
}

export class PostClient {
  constructor(private readonly postType: PostType) {}

  async getPost(id: string): Promise<Post | undefined> {
    try {
      const post = await import(
        `./${postTypeToUrlPrefix(this.postType)}/${this.postType}/${id}`
      );
      return post.default as Post;
    } catch (e) {
      console.error("failed to load post.");
      return undefined;
    }
  }

  async listPosts(): Promise<PostSummary[]> {
    const response = await fetch(
      `/api/posts/${postTypeToUrlPrefix(this.postType)}`,
    );
    const rawJson = await response.json();
    return rawJson.map((rawSummary: any) => {
      return { ...rawSummary, timestamp: new Date(rawSummary.timestamp) };
    }) as PostSummary[];
  }
}
