import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  BlogCategory,
  BlogCategoryFormValues,
  BlogPost,
  BlogPostDetail,
  BlogPostFormValues,
  BlogPostListParams,
  PaginatedResponse,
} from "../types";
import { blogKeys } from "./blog.keys";

// ---------- Raw shapes + mappers ----------

interface RawPost {
  id: string;
  title: string;
  slug: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  categoryName?: string | null;
  thumbnailUrl?: string | null;
  published?: boolean;
  status?: string;
  viewCount?: number;
  contentMd?: string | null;
  content?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function mapPost(raw: RawPost): BlogPost {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    categoryId: raw.categoryId ?? raw.category?.id ?? undefined,
    categoryName: raw.categoryName ?? raw.category?.name ?? undefined,
    thumbnailUrl: raw.thumbnailUrl ?? undefined,
    published: raw.published ?? raw.status === "PUBLISHED",
    viewCount: raw.viewCount,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function mapPostDetail(raw: RawPost): BlogPostDetail {
  return {
    ...mapPost(raw),
    content: raw.contentMd ?? raw.content ?? "",
  };
}

// Map FE form values → BE body. BE CreatePostRequest/UpdatePostRequest dùng field `content`
// (markdown); slug do BE tự sinh nên KHÔNG gửi.
function toPostBody(values: BlogPostFormValues) {
  return {
    title: values.title,
    categoryId: values.categoryId,
    thumbnailUrl: values.thumbnailUrl,
    content: values.content,
  };
}

// ---------- Posts ----------

export function useBlogPosts(params: BlogPostListParams) {
  return useQuery<PaginatedResponse<BlogPost>, Error>({
    queryKey: blogKeys.postList(params),
    queryFn: () =>
      // Admin list: GET /blog/admin/posts (gồm cả DRAFT). Trả PostPage {items,page,size,hasNext}
      // — KHÔNG có total; filter published lọc client-side (endpoint chỉ nhận categoryId).
      coreClient
        .get("/blog/admin/posts", {
          params: {
            categoryId: params.categoryId,
            page: Math.max(0, params.page - 1),
            size: params.pageSize,
          },
        })
        .then((r) => {
          const data = r.data as { items?: RawPost[]; hasNext?: boolean } | null;
          const rows = data?.items ?? [];
          const mapped = rows.map(mapPost);
          const filtered =
            params.published === undefined ? mapped : mapped.filter((p) => p.published === params.published);
          // hasNext → còn trang sau: đẩy total để antd hiển thị nút next.
          const total = data?.hasNext
            ? params.page * params.pageSize + 1
            : (params.page - 1) * params.pageSize + mapped.length;
          return { items: filtered, total };
        }),
    placeholderData: (previous) => previous,
  });
}

export function useBlogPost(id: string | undefined) {
  return useQuery<BlogPostDetail, Error>({
    queryKey: blogKeys.postDetail(id),
    // Editor prefill theo id (gồm cả draft) — public detail chỉ theo slug + chỉ published.
    queryFn: () => coreClient.get(`/blog/admin/posts/${id}`).then((r) => mapPostDetail(r.data as RawPost)),
    enabled: !!id,
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation<BlogPostDetail, Error, BlogPostFormValues>({
    mutationFn: (values) =>
      coreClient.post("/blog/posts", toPostBody(values)).then((r) => mapPostDetail(r.data as RawPost)),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.posts() }),
    onError: handleAdminMutationError,
  });
}

export function useUpdateBlogPost(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation<BlogPostDetail, Error, BlogPostFormValues>({
    mutationFn: (values) =>
      coreClient.put(`/blog/posts/${id}`, toPostBody(values)).then((r) => mapPostDetail(r.data as RawPost)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blogKeys.posts() });
      qc.invalidateQueries({ queryKey: blogKeys.postDetail(id) });
    },
    onError: handleAdminMutationError,
  });
}

// Publish/unpublish DÙNG CHUNG endpoint PATCH /blog/posts/{id}/publish với body {published}.
export function usePublishBlogPost() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => coreClient.patch(`/blog/posts/${id}/publish`, { published: true }).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.posts() }),
    onError: handleAdminMutationError,
  });
}

export function useUnpublishBlogPost() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => coreClient.patch(`/blog/posts/${id}/publish`, { published: false }).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.posts() }),
    onError: handleAdminMutationError,
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => coreClient.delete(`/blog/posts/${id}`).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.posts() }),
    onError: handleAdminMutationError,
  });
}

// ---------- Categories ----------

export function useBlogCategories() {
  return useQuery<BlogCategory[], Error>({
    queryKey: blogKeys.categories(),
    queryFn: () =>
      coreClient.get("/blog/categories").then((r) => {
        const data = r.data as BlogCategory[] | { items?: BlogCategory[] } | null;
        return Array.isArray(data) ? data : data?.items ?? [];
      }),
  });
}

// BE CategoryRequest = {name, sortOrder}; slug tự sinh, KHÔNG có description.
function toCategoryBody(values: BlogCategoryFormValues) {
  return { name: values.name, sortOrder: values.sortOrder ?? 0 };
}

export function useCreateBlogCategory() {
  const qc = useQueryClient();
  return useMutation<BlogCategory, Error, BlogCategoryFormValues>({
    mutationFn: (values) =>
      coreClient.post("/blog/categories", toCategoryBody(values)).then((r) => r.data as BlogCategory),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.categories() }),
    onError: handleAdminMutationError,
  });
}

export function useUpdateBlogCategory() {
  const qc = useQueryClient();
  return useMutation<BlogCategory, Error, { id: string } & BlogCategoryFormValues>({
    mutationFn: ({ id, ...values }) =>
      coreClient.put(`/blog/categories/${id}`, toCategoryBody(values)).then((r) => r.data as BlogCategory),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.categories() }),
    onError: handleAdminMutationError,
  });
}

export function useDeleteBlogCategory() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => coreClient.delete(`/blog/categories/${id}`).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.categories() }),
    onError: handleAdminMutationError,
  });
}
