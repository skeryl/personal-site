import * as React from "react";
import styled from "styled-components";
import { PostType, PostTypes } from "personal-site-model";
import { PostSummaryComponent } from "./PostSummary";
import { ProjectContent, SubHeader } from "personal-site-common";
import { useListPosts } from "../../hooks/content";
import { postTypeToUrlPrefix } from "../../content/post-client";

const Link = styled("a")`
  color: rgb(85, 73, 0);
`;

export interface PostListProps {
  type: PostType;
}

export function PostList({ type }: PostListProps) {
  const { result: posts } = useListPosts(type);
  const postTypePrefix = postTypeToUrlPrefix(type);

  return (
    <>
      <SubHeader text={postTypePrefix} />
      <ProjectContent>
        <div className="post-summary-container">
          {posts &&
            posts.map((post) => (
              <Link
                href={`/${postTypePrefix}/${post.id}`}
                className="post-list-item"
                key={post.id}
              >
                <PostSummaryComponent key={post.id} post={post} />
              </Link>
            ))}
        </div>
      </ProjectContent>
    </>
  );
}
