import * as React from "react";
import { PostComponent } from "./Post";
import { PostType } from "personal-site-model";
import { Loading } from "../Loading";
import { ProjectContent, SubHeader } from "personal-site-common";
import { usePost } from "../../hooks/content";
import { RouteComponentProps } from "react-router-dom";

export type PostDetailRouteProps = RouteComponentProps<
  Pick<PostDetailProps, "id">
>;

export interface PostDetailProps {
  id: string;
  type: PostType;
}

export function PostDetail({ id, type }: PostDetailProps) {
  const { result: post, isLoading } = usePost(type, id);

  return (
    <>
      <SubHeader text={"art"} link={"/art"} />
      <ProjectContent>
        {!isLoading ? (
          <Loading />
        ) : post ? (
          <PostComponent
            content={post?.content()}
            summary={post.summary}
            full={true}
          />
        ) : null}
      </ProjectContent>
    </>
  );
}
