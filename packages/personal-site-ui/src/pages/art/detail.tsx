import React from "react";
import { PostType } from "personal-site-model";
import {
  PostDetail,
  PostDetailRouteProps,
} from "../../components/post/PostDetail";

export default function ArtDetail(props: PostDetailRouteProps) {
  return <PostDetail type={PostType.experiment} id={props.match.params.id} />;
}
