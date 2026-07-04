// Shared academic types. API fields marked (assumed) map to design.md contracts.

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

// ---------- Subjects ----------

export type SubjectStatus = "active" | "inactive" | "draft";

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: SubjectStatus;
  lecturerIds: string[];
  moderatorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningOutcome {
  id: string;
  order: number;
  description: string;
}

export interface SubjectStaff {
  userId: string;
  fullName: string;
  email: string;
  role: "lecturer" | "moderator";
}

export interface SubjectDetail extends Subject {
  outcomes: LearningOutcome[];
  prerequisites: Subject[]; // (assumed) BE returns shallow subject rows
  staff: SubjectStaff[];
}

export interface SubjectListParams {
  search?: string;
  status?: SubjectStatus;
  lecturerId?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SubjectFormValues {
  code: string;
  name: string;
  description?: string;
  status: SubjectStatus;
  outcomes?: LearningOutcome[];
}

export type SubjectFilterFormValues = {
  search?: string;
  status?: SubjectStatus;
  lecturerId?: string;
};

// ---------- Courses ----------

export type CourseStatus = "draft" | "review" | "published" | "archived";

export interface Course {
  id: string;
  subjectId: string;
  subjectName?: string;
  name: string;
  summary?: string;
  status: CourseStatus;
  workflowStatus: CourseStatus;
  lecturerIds: string[];
  basePrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseTreeNode {
  id?: string;
  key: string; // client key for tree rendering
  title: string;
  type: "section" | "lesson" | "assignment";
  children?: CourseTreeNode[];
  // path used for 422 error mapping
  path?: string;
  error?: string;
}

export interface Entitlement {
  resourceType: string;
  resourceId?: string;
  accessMode: "view" | "download" | "submit";
}

export interface CoursePackage {
  id?: string;
  name: string;
  price: number;
  entitlements: Entitlement[];
}

export interface CourseDetail extends Course {
  tree: CourseTreeNode[];
  packages: CoursePackage[];
  publishChecklist: PublishChecklistItem[];
}

export interface PublishChecklistItem {
  key: string;
  label: string;
  passed: boolean;
}

export interface CourseListParams {
  search?: string;
  subjectId?: string;
  status?: CourseStatus;
  lecturerId?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CourseFormValues {
  subjectId: string;
  name: string;
  summary?: string;
}

export type CourseFilterFormValues = {
  search?: string;
  subjectId?: string;
  status?: CourseStatus;
  lecturerId?: string;
};

// ---------- Resources ----------

export type ResourceType = "video" | "pdf" | "slide" | "quiz" | "link" | "other";
export type ResourceStatus = "pending" | "approved" | "rejected";
export type ResourceVisibility = "public" | "enrolled" | "package_only";

export interface Resource {
  id: string;
  subjectId: string;
  subjectName?: string;
  title: string;
  type: ResourceType;
  status: ResourceStatus;
  visibility: ResourceVisibility;
  license?: string;
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceDetail extends Resource {
  fileUrl?: string;
  rejectReason?: string;
}

export interface ResourceVersion {
  version: number;
  status: ResourceStatus;
  createdBy: string;
  createdAt: string;
}

export interface ResourceListParams {
  subjectId?: string;
  type?: ResourceType;
  status?: ResourceStatus;
  search?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ResourceFormValues {
  subjectId: string;
  title: string;
  type: ResourceType;
  license?: string;
  visibility: ResourceVisibility;
}

export type ResourceFilterFormValues = {
  subjectId?: string;
  type?: ResourceType;
  status?: ResourceStatus;
  search?: string;
};

// ---------- Learning Packs ----------

export type PackStatus = "active" | "inactive" | "draft";

export interface Pack {
  id: string;
  name: string;
  description?: string;
  status: PackStatus;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PackItemType = "course" | "resource";

export interface PackItem {
  type: PackItemType;
  refId: string;
  title: string;
  order: number;
}

export interface PackDetail extends Pack {
  items: PackItem[];
}

export interface PackListParams {
  search?: string;
  status?: PackStatus;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PackFormValues {
  name: string;
  description?: string;
  status: PackStatus;
}

export type PackFilterFormValues = {
  search?: string;
  status?: PackStatus;
};

// ---------- Quiz ----------

export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizStatus = "draft" | "ready" | "archived";

export interface QuizAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  subjectId: string;
  subjectName?: string;
  content: string;
  answers: QuizAnswer[];
  correctAnswerId: string;
  tags: string[];
  difficulty: QuizDifficulty;
  status: QuizStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QuizListParams {
  subjectId?: string;
  tag?: string;
  difficulty?: QuizDifficulty;
  status?: QuizStatus;
  search?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface QuizFormValues {
  subjectId: string;
  content: string;
  answers: QuizAnswer[];
  correctAnswerId: string;
  tags: string[];
  difficulty: QuizDifficulty;
  status: QuizStatus;
}

export type QuizFilterFormValues = {
  subjectId?: string;
  tag?: string;
  difficulty?: QuizDifficulty;
  status?: QuizStatus;
  search?: string;
};

export interface QuizImportJob {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imported?: number;
  errors?: { row: number; message: string }[];
  failedReason?: string;
}
