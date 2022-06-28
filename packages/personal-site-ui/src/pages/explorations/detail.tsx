import React from "react";
import { PostType } from "personal-site-model";
import {
  PostDetail,
  PostDetailRouteProps,
} from "../../components/post/PostDetail";

export default function ExplorationDetail(props: PostDetailRouteProps) {
  return <PostDetail type={PostType.exploration} id={props.match.params.id} />;
}
