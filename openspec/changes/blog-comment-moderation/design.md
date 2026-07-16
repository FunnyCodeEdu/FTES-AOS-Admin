# Design — blog-comment-moderation

Bối cảnh (đã đọc 2026-07-16): Vite + React + TS, antd v5, react-router v7,
@tanstack/react-query v5; `coreClient` base `${ROOT}/api/v1`, envelope unwrap sẵn;
route + menu tập trung `src/app/routeRegistry.tsx`; mutation
`onError: handleAdminMutationError`; module blog hiện có
`features/content/blog/{api,pages,components,types}` với `blogKeys` factory.
BE contract sau delta `blog-admin-filter-and-engagement-seed` (FTES-AOS-Backend):
`GET /blog/admin/posts?categoryId&published&page&size` → `PostPage{items,page,size,hasNext,totalElements}`;
`GET /blog/posts/{postId}/comments?page&size` → `CommentPage{items,page,size,hasNext}`
(item có `authorUsername` nullable); `PUT /blog/comments/{id}` body `{content}` (1..5000);
`DELETE /blog/comments/{id}` — hai lệnh sau cho phép chủ comment HOẶC `blog.manage`.

## 1. `useBlogPosts` — filter + total thật

`features/content/blog/api/blog.api.ts`:

```ts
// params gửi lên BE thêm published (server-side filter — bỏ .filter client-side cũ)
params: {
  categoryId: params.categoryId,
  published: params.published,          // undefined = tất cả (axios tự bỏ param)
  page: Math.max(0, params.page - 1),
  size: params.pageSize,
},
// total: ưu tiên totalElements; BE cũ chưa có field → fallback heuristic hasNext hiện tại
const data = r.data as { items?: RawPost[]; hasNext?: boolean; totalElements?: number | null };
const rows = (data?.items ?? []).map(mapPost);
const total =
  typeof data?.totalElements === "number"
    ? data.totalElements
    : data?.hasNext
      ? params.page * params.pageSize + 1
      : (params.page - 1) * params.pageSize + rows.length;
return { items: rows, total };
```

`BlogListPage` không đổi logic filter (đã đọc `published` từ `useSearchParams` và đưa vào
params) — chỉ hết cảnh lọc sai trang.

## 2. API + keys comment

`types.ts`:

```ts
export interface BlogComment {
  id: string;
  postId: string;
  userId: string;
  authorUsername?: string | null;
  content: string;
  emojiCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface BlogCommentPage { items: BlogComment[]; page: number; size: number; hasNext: boolean; }
```

`blog.keys.ts`:

```ts
comments: (postId: string | undefined) => [...blogKeys.all, "comments", postId] as const,
commentList: (postId: string | undefined, page: number, size: number) =>
  [...blogKeys.comments(postId), { page, size }] as const,
```

`blog.api.ts`:

```ts
export function useBlogComments(postId: string | undefined, page: number, size: number) {
  return useQuery<BlogCommentPage, Error>({
    queryKey: blogKeys.commentList(postId, page, size),
    queryFn: () =>
      coreClient
        .get(`/blog/posts/${postId}/comments`, { params: { page, size } })
        .then((r) => r.data as BlogCommentPage),
    enabled: !!postId,
    placeholderData: (previous) => previous,
  });
}

export function useUpdateBlogComment(postId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; content: string }>({
    mutationFn: ({ id, content }) =>
      coreClient.put(`/blog/comments/${id}`, { content }).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.comments(postId) }),
    onError: handleAdminMutationError,
  });
}

export function useDeleteBlogComment(postId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => coreClient.delete(`/blog/comments/${id}`).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.comments(postId) }),
    onError: handleAdminMutationError,
  });
}
```

## 3. `BlogCommentsPage` — `/content/blog/:id/comments`

- `useParams()` lấy `id` (post id); header: `useBlogPost(id)` → title bài + nút quay lại
  `/content/blog` (giữ searchParams cũ nếu có qua `navigate(-1)` fallback route tĩnh).
- State `page`/`size` qua `useSearchParams` (mặc định 0/20, size cap 50 khớp BE).
- antd `Table<BlogComment>` `rowKey="id"`:
  - "Người viết": `authorUsername ?? userId` (id thì render `<Typography.Text code>` rút gọn
    8 ký tự + Tooltip full).
  - "Nội dung": `Typography.Paragraph ellipsis={{rows: 2, expandable: true}}`,
    `whiteSpace: "pre-wrap"`.
  - "Tim": `emojiCount`; "Lúc": `createdAt` format `DD/MM/YYYY HH:mm`.
  - "Hành động" bọc `<Can permissions={["blog.manage"]}>`:
    - **Ẩn/biên tập**: mở `Modal` chứa `Input.TextArea` (maxLength 5000, prefill content,
      helper "Thay nội dung vi phạm bằng ghi chú kiểm duyệt, vd: [Nội dung đã bị ẩn do vi
      phạm quy tắc cộng đồng]" + nút chèn nhanh chuỗi đó) → `useUpdateBlogComment`.
    - **Xoá**: `Modal.confirm({ okType: "danger" })` → `useDeleteBlogComment`.
- Phân trang: `CommentPage` KHÔNG có total → không dùng `Table pagination`; render cặp nút
  "Trang trước" (disabled khi page 0) / "Trang sau" (disabled khi `!hasNext`) + nhãn
  "Trang {page+1}". Toast `message.success` sau mỗi mutation.
- Empty: `Table` empty text "Bài viết chưa có bình luận".

## 4. Wiring

- `routeRegistry.tsx`:

```tsx
{
  path: "/content/blog/:id/comments",
  element: <BlogCommentsPage />,
  layout: "admin",
  requiredPermissions: ["blog.manage"],
},
```

  (KHÔNG `nav` — màn ngữ cảnh theo bài, vào từ list.)
- `BlogListPage.tsx`: cột hành động thêm `<Button size="small" icon={<CommentOutlined />}>`
  "Bình luận" → `navigate(`/content/blog/${record.id}/comments`)`.

## Seed data

- Admin không có migration. Dữ liệu test đến từ BE FTES-AOS-Backend:
  - `V201__seed_blog_from_legacy.sql` (đã có): 19 bài + 6 category.
  - `V215__seed_blog_engagement_demo.sql` (change `blog-admin-filter-and-engagement-seed`):
    3 comment + reactions cho 5 bài mới nhất, idempotent — mở màn moderation là có dòng để
    thao tác ngay trên deploy test.

## Verify

- `npm run build` + `tsc --noEmit` sạch.
- Smoke apitest (tài khoản có `blog.manage`): lọc Bản nháp ở list posts ra đúng kết quả đa
  trang + tổng đúng; mở "Bình luận" 1 bài seed → thấy 3 comment demo; ẩn 1 comment (nội dung
  đổi ngay trên FE learner) và xoá 1 comment (biến mất cả 2 phía); tài khoản thiếu quyền
  không vào được route.
