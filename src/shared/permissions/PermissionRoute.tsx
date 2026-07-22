import { Navigate, useLocation } from "react-router-dom";
import { Button, Layout, Result, Skeleton } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useAuthStore } from "../../features/auth/store";
import { useMe } from "../../features/auth/api";
import { hasAnyPermission } from "./index";
import { ApiError } from "../api/client";

interface PermissionRouteProps {
  requiredPermissions?: string[];
  requiredScope?: boolean;
  requiredScopeType?: string;
  scopeMessage?: string;
  children: React.ReactNode;
}

function FullPageSkeleton() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Sider theme="light" collapsedWidth={80} collapsed>
        <div style={{ height: 64, padding: 16 }}>
          <Skeleton.Button active style={{ width: "100%" }} />
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: "transparent", paddingInline: 24 }}>
          <Skeleton active paragraph={false} />
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>
          <Skeleton active />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

function ErrorResult({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const is401 = error instanceof ApiError && error.code === 401;
  if (is401) {
    return null;
  }

  return (
    <Result
      status="error"
      title="Không thể tải thông tin tài khoản"
      subTitle={error.message}
      extra={
        <Button icon={<ReloadOutlined />} onClick={onRetry}>
          Thử lại
        </Button>
      }
    />
  );
}

export function PermissionRoute({
  requiredPermissions,
  requiredScope,
  requiredScopeType,
  scopeMessage,
  children,
}: PermissionRouteProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me, isLoading, error, refetch } = useMe();
  const location = useLocation();
  const returnUrl = encodeURIComponent(location.pathname + location.search);

  if (accessToken === null) {
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  if (isLoading) return <FullPageSkeleton />;

  if (error) {
    if (error instanceof ApiError && error.code === 401) {
      return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
    }
    return <ErrorResult error={error} onRetry={() => refetch()} />;
  }

  if (me && requiredPermissions) {
    const permissions = new Set(me.permissions);
    if (!hasAnyPermission(permissions, requiredPermissions)) {
      return (
        <Navigate
          to="/403"
          replace
          state={{
            missingPermissions: requiredPermissions,
            from: location.pathname,
          }}
        />
      );
    }
  }

  if (me && requiredScope) {
    const now = new Date();
    const hasActiveScope = me.scopedGrants.some(
      (g) =>
        (!g.expiresAt || new Date(g.expiresAt) > now) &&
        g.scopeId &&
        (!requiredScopeType || g.scopeType === requiredScopeType)
    );
    if (!hasActiveScope) {
      return (
        <Navigate
          to="/403"
          replace
          state={{
            scopeMessage:
              scopeMessage ?? "Bạn cần một scope còn hiệu lực để truy cập.",
            from: location.pathname,
          }}
        />
      );
    }
  }

  return <>{children}</>;
}
