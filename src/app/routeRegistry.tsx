import { HomeOutlined, SafetyOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import DashboardPage from "../features/dashboard/DashboardPage";
import AccessMatrixPage from "../features/rbac/pages/AccessMatrixPage";
import PermissionCatalogPage from "../features/rbac/pages/PermissionCatalogPage";
import RoleEditorPage from "../features/rbac/pages/RoleEditorPage";
import RoleListPage from "../features/rbac/pages/RoleListPage";
import UserAccessDetailPage from "../features/rbac/pages/UserAccessDetailPage";
import UserAccessSearchPage from "../features/rbac/pages/UserAccessSearchPage";
import { ForbiddenPage, NotFoundPage } from "../shared/permissions";

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
