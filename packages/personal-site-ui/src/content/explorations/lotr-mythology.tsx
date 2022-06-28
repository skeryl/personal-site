import React from "react";
import { Post, PostType } from "personal-site-model";

export function LotrMythology() {
  return <div></div>;
}

const post: Post = {
  summary: {
    id: "lotr-mythology",
    tags: [],
    timestamp: new Date(2022, 5, 27),
    title: "Lord of the Rings Mythology Map",
    type: PostType.exploration,
  },
  content: LotrMythology,
};

export default post;
