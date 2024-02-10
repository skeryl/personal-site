import React from "react";
import { PostType } from "personal-site-model";
import { PostList } from "../../components/post/PostList";

export default function ExplorationList() {
  return <PostList type={PostType.exploration} />;
}
