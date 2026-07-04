import {
  BookOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SafetyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import DashboardPage from "../features/dashboard/DashboardPage";
import AccessMatrixPage from "../features/rbac/pages/AccessMatrixPage";
import PermissionCatalogPage from "../features/rbac/pages/PermissionCatalogPage";
import RoleEditorPage from "../features/rbac/pages/RoleEditorPage";
import RoleListPage from "../features/rbac/pages/RoleListPage";
import UserAccessDetailPage from "../features/rbac/pages/UserAccessDetailPage";
import UserAccessSearchPage from "../features/rbac/pages/UserAccessSearchPage";
import { ForbiddenPage, NotFoundPage } from "../shared/permissions";
import UserListPage from "../features/users/pages/UserListPage";
import UserDetailPage from "../features/users/pages/UserDetailPage";
import ImpersonateViewerPage from "../features/users/pages/ImpersonateViewerPage";
import SubjectListPage from "../features/academic/subjects/pages/SubjectListPage";
import SubjectDetailPage from "../features/academic/subjects/pages/SubjectDetailPage";
import CourseListPage from "../features/academic/courses/pages/CourseListPage";
import CourseDetailPage from "../features/academic/courses/pages/CourseDetailPage";
import ResourceListPage from "../features/academic/resources/pages/ResourceListPage";
import ResourceReviewQueuePage from "../features/academic/resources/pages/ResourceReviewQueuePage";
import ResourceDetailPage from "../features/academic/resources/pages/ResourceDetailPage";
import PackListPage from "../features/academic/packs/pages/PackListPage";
import PackDetailPage from "../features/academic/packs/pages/PackDetailPage";
import QuizBankPage from "../features/academic/quiz/pages/QuizBankPage";

export interface NavEntry {
  label: string;
  icon?: ReactNode;
  group?: string;
}

export interface RouteDefinition {
  path: string;
  element: ReactNode;
  layout: "auth" | "admin" | "none";
  requiredPermissions?: string[];
  nav?: NavEntry;
}

export const routeRegistry: RouteDefinition[] = [
  {
    path: "/",
    element: <DashboardPage />,
    layout: "admin",
    nav: { label: "Trang chủ", icon: <HomeOutlined /> },
  },
  {
    path: "/system/rbac/roles",
    element: <RoleListPage />,
    layout: "admin",
    requiredPermissions: ["rbac.role.read"],
    nav: { label: "Vai trò & quyền", icon: <SafetyOutlined />, group: "Hệ thống" },
  },
  {
    path: "/system/rbac/roles/new",
    element: <RoleEditorPage />,
    layout: "admin",
    requiredPermissions: ["rbac.role.manage"],
  },
  {
    path: "/system/rbac/roles/:roleId",
    element: <RoleEditorPage />,
    layout: "admin",
    requiredPermissions: ["rbac.role.read"],
  },
  {
    path: "/system/rbac/permissions",
    element: <PermissionCatalogPage />,
    layout: "admin",
    requiredPermissions: ["rbac.permission.read"],
    nav: { label: "Catalog quyền", icon: <SafetyOutlined />, group: "Hệ thống" },
  },
  {
    path: "/system/rbac/users",
    element: <UserAccessSearchPage />,
    layout: "admin",
    requiredPermissions: ["rbac.assignment.manage"],
    nav: { label: "Phân quyền user", icon: <SafetyOutlined />, group: "Hệ thống" },
  },
  {
    path: "/system/rbac/users/:userId",
    element: <UserAccessDetailPage />,
    layout: "admin",
    requiredPermissions: ["rbac.assignment.manage"],
  },
  {
    path: "/system/rbac/matrix",
    element: <AccessMatrixPage />,
    layout: "admin",
    requiredPermissions: ["rbac.matrix.read"],
    nav: { label: "Ma trận quyền", icon: <SafetyOutlined />, group: "Hệ thống" },
  },
  {
    path: "/users",
    element: <UserListPage />,
    layout: "admin",
    requiredPermissions: ["user.view"],
    nav: { label: "Người dùng", icon: <UserOutlined />, group: "Hệ thống" },
  },
  {
    path: "/users/:id",
    element: <UserDetailPage />,
    layout: "admin",
    requiredPermissions: ["user.view"],
  },
  {
    path: "/users/:id/impersonate",
    element: <ImpersonateViewerPage />,
    layout: "admin",
    requiredPermissions: ["user.view", "user.impersonate"],
  },
  {
    path: "/academic/subjects",
    element: <SubjectListPage />,
    layout: "admin",
    requiredPermissions: ["subject.view"],
    nav: { label: "Môn học", icon: <BookOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/subjects/:id",
    element: <SubjectDetailPage />,
    layout: "admin",
    requiredPermissions: ["subject.view"],
  },
  {
    path: "/academic/courses",
    element: <CourseListPage />,
    layout: "admin",
    requiredPermissions: ["course.view"],
    nav: { label: "Khoá học", icon: <ReadOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/courses/:id",
    element: <CourseDetailPage />,
    layout: "admin",
    requiredPermissions: ["course.view"],
  },
  {
    path: "/academic/resources",
    element: <ResourceListPage />,
    layout: "admin",
    requiredPermissions: ["resource.view"],
    nav: { label: "Học liệu", icon: <FileTextOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/resources/review",
    element: <ResourceReviewQueuePage />,
    layout: "admin",
    requiredPermissions: ["resource.approve"],
    nav: { label: "Duyệt học liệu", icon: <FileTextOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/resources/:id",
    element: <ResourceDetailPage />,
    layout: "admin",
    requiredPermissions: ["resource.view"],
  },
  {
    path: "/academic/packs",
    element: <PackListPage />,
    layout: "admin",
    requiredPermissions: ["pack.view"],
    nav: { label: "Learning Pack", icon: <FolderOpenOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/packs/:id",
    element: <PackDetailPage />,
    layout: "admin",
    requiredPermissions: ["pack.view"],
  },
  {
    path: "/academic/quiz-bank",
    element: <QuizBankPage />,
    layout: "admin",
    requiredPermissions: ["quiz.view"],
    nav: { label: "Quiz bank", icon: <QuestionCircleOutlined />, group: "Học thuật" },
  },
  {
    path: "/403",
    element: <ForbiddenPage />,
    layout: "admin",
  },
  {
    path: "/404",
    element: <NotFoundPage />,
    layout: "admin",
  },
];
