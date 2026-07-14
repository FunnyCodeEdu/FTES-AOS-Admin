export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface BlogCategoryFormValues {
  name: string;
  slug?: string;
  description?: string;
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

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}
