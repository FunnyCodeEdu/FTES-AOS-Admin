export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder?: number;
}

export interface BlogCategoryFormValues {
  name: string;
  sortOrder?: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  categoryId?: string;
  categoryName?: string;
  thumbnailUrl?: string;
  published: boolean;
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogPostDetail extends BlogPost {
  /** Markdown content (backend `content_md`). */
  content: string;
}

export interface BlogPostFormValues {
  title: string;
  slug: string;
  categoryId?: string;
  thumbnailUrl?: string;
  content: string;
}

export interface BlogPostListParams {
  categoryId?: string;
  published?: boolean;
  page: number;
  pageSize: number;
}

export interface BlogComment {
  id: string;
  postId: string;
  userId: string;
  /** Tên hiển thị người viết; BE có thể trả null → fallback userId rút gọn. */
  authorUsername?: string | null;
  content: string;
  emojiCount: number;
  createdAt: string;
  updatedAt: string;
}

/** CommentPage từ BE: KHÔNG có totalElements → phân trang bằng hasNext (Trước/Sau). */
export interface BlogCommentPage {
  items: BlogComment[];
  page: number;
  size: number;
  hasNext: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

/**
 * Metadata phân trang thô từ BE cho list (PostPage). `totalElements` chỉ có sau delta
 * `blog-admin-filter-and-engagement-seed`; BE cũ thiếu field → fallback heuristic `hasNext`.
 */
export interface RawPageMeta {
  hasNext?: boolean;
  totalElements?: number | null;
}
