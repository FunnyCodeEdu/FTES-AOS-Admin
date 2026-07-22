import { createBrowserRouter, type RouteObject } from "react-router-dom";
import LoginPage from "../features/auth/LoginPage";
import { NotFoundPage, PermissionRoute } from "../shared/permissions";
import AdminLayout from "./layout/AdminLayout";
import { routeRegistry } from "./routeRegistry";

export * from "./routeRegistry";

export function createAdminRouter() {
  const routes: RouteObject[] = [
    {
      path: "/login",
      element: <LoginPage />,
    },
    ...routeRegistry.map((route) => ({
      path: route.path,
      element:
        route.layout === "admin" ? (
          <AdminLayout>
            <PermissionRoute
              requiredPermissions={route.requiredPermissions}
              requiredScope={route.requiredScope}
              requiredScopeType={route.requiredScopeType}
              scopeMessage={route.scopeMessage}
            >
              {route.element}
            </PermissionRoute>
          </AdminLayout>
        ) : (
          route.element
        ),
    })),
    {
      path: "*",
      element: (
        <AdminLayout>
          <PermissionRoute>
            <NotFoundPage />
          </PermissionRoute>
        </AdminLayout>
      ),
    },
  ];

  return createBrowserRouter(routes);
}
