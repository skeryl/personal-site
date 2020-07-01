import { PostSummary } from "personal-site-model";
import { PostSummaryComponent } from "../components/post/PostSummary";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { ContentContext } from "../content/ContentContext";
import styled from "styled-components";
import { SubHeader } from "personal-site-common";
import { ProjectContent } from "personal-site-common";

const Link = styled("a")`
  color: rgb(85, 73, 0);
`;

export default function PostList() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const contentService = useContext(ContentContext);

  useEffect(() => {
    contentService.listPosts().then((posts) => {
      setPosts(posts);
    });
  }, []);
  return (
    <>
      <SubHeader text={"art"} />
      <ProjectContent>
        <div className="post-summary-container">
          {posts &&
            posts.map((post) => (
              <Link href={`/art/${post.id}`} className="post-list-item">
                <PostSummaryComponent key={post.id} post={post} />
              </Link>
            ))}
        </div>
      </ProjectContent>
    </>
  );
}
