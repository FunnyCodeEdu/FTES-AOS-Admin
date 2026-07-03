import { HomeOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import DashboardPage from "../features/dashboard/DashboardPage";
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
