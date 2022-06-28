import fs, { PathLike } from "fs";
import { PostSummary, PostType } from "personal-site-model";
import path from "path";

const sortByTimeCreated = (a: PostSummary, b: PostSummary) =>
  Math.sign(b.timestamp.getTime() - a.timestamp.getTime());

export class ContentDatabase {
  private readonly postSummaries: Promise<Map<string, PostSummary>>;

  constructor(
    directory: string,
    private readonly rootPath: PathLike = path.resolve(
      __dirname,
      `../../personal-site-ui/src/content/${directory}`,
    ),
  ) {
    const postFiles = fs.readdirSync(this.rootPath);
    console.log("Directory: ", directory, "; files: ", postFiles);
    this.postSummaries = Promise.all(
      postFiles.map(async (postFile) => {
        const importedPost = await import(`${this.rootPath}/${postFile}`);
        return importedPost.default.summary as PostSummary;
      }),
    ).then((posts) =>
      posts.reduce((result, post) => {
        result.set(post.id, post);
        return result;
      }, new Map<string, PostSummary>()),
    );
  }

  public getSummary = async (id: string): Promise<PostSummary | undefined> => {
    const postSummaries = await this.postSummaries;
    return postSummaries.get(id);
  };

  public listSummaries = async (): Promise<PostSummary[]> => {
    const postSummaries = await this.postSummaries;
    return Array.from<PostSummary>(postSummaries.values())
      .filter((post) => !post.isHidden)
      .sort(sortByTimeCreated);
  };

  public latest = async (): Promise<PostSummary> => {
    const postSummaries = await this.postSummaries;
    return Array.from<PostSummary>(postSummaries.values())
      .filter((post) => !post.isHidden)
      .sort(sortByTimeCreated)[0];
  };
}
