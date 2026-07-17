import type { BlogPostListParams } from "../types";

export const blogKeys = {
  all: ["blog"] as const,
  posts: () => [...blogKeys.all, "posts"] as const,
  postList: (params: BlogPostListParams) => [...blogKeys.posts(), "list", params] as const,
  postDetail: (id: string | undefined) =>
    id ? ([...blogKeys.posts(), "detail", id] as const) : ([...blogKeys.posts(), "detail"] as const),
  categories: () => [...blogKeys.all, "categories"] as const,
  comments: (postId: string | undefined) => [...blogKeys.all, "comments", postId] as const,
  commentList: (postId: string | undefined, page: number, size: number) =>
    [...blogKeys.comments(postId), { page, size }] as const,
};
