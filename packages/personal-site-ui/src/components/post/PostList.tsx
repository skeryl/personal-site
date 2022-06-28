import * as React from "react";
import styled from "styled-components";
import { PostType, PostTypes } from "personal-site-model";
import { PostSummaryComponent } from "./PostSummary";
import { ProjectContent, SubHeader } from "personal-site-common";
import { useListPosts } from "../../hooks/content";

const Link = styled("a")`
  color: rgb(85, 73, 0);
`;

export interface PostListProps {
  type: PostType;
}

export function PostList({ type }: PostListProps) {
  const { result: posts } = useListPosts(type);

  return (
    <>
      <SubHeader text={"art"} />
      <ProjectContent>
        <div className="post-summary-container">
          {posts &&
            posts.map((post) => (
              <Link
                href={`/art/${post.id}`}
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
