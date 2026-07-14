export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  courseCount?: number;
}

export interface CategoryFormValues {
  name: string;
  slug?: string;
  description?: string;
}
