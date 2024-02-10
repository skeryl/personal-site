import * as React from "react";
import { PostComponent } from "./Post";
import { PostType } from "personal-site-model";
import { Loading } from "../Loading";
import { ProjectContent, SubHeader } from "personal-site-common";
import { usePost } from "../../hooks/content";
import { RouteComponentProps } from "react-router-dom";
import { postTypeToUrlPrefix } from "../../content/post-client";

export type PostDetailRouteProps = RouteComponentProps<
  Pick<PostDetailProps, "id">
>;

export interface PostDetailProps {
  id: string;
  type: PostType;
}

export function PostDetail({ id, type }: PostDetailProps) {
  const { result: post, isLoading } = usePost(type, id);
  const postTypePrefix = postTypeToUrlPrefix(type);

  const content = post?.content();
  console.log("content: ", content);
  return (
    <>
      <SubHeader text={postTypePrefix} link={`/${postTypePrefix}`} />
      <ProjectContent>
        {isLoading ? (
          <Loading />
        ) : post ? (
          <PostComponent content={content} summary={post.summary} full={true} />
        ) : null}
      </ProjectContent>
    </>
  );
}
