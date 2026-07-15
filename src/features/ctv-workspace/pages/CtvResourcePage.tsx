import { useMemo, useState } from "react";
import { Alert, Card, Empty, Select, Space, Typography } from "antd";
import { useCtvScopes } from "../api/ctvMe.api";
import { ScopeGuard } from "../components/ScopeGuard";
import type { CtvScope } from "../shared/types";

const RESOURCE_SCOPE_TYPES = new Set(["SUBJECT", "RESOURCE_SET"]);

export default function CtvResourcePage() {
  const { scopes } = useCtvScopes();
  const resourceScopes = useMemo(
    () => scopes.filter((s) => RESOURCE_SCOPE_TYPES.has(s.scopeType)),
    [scopes]
  );
  const [selectedScopeId, setSelectedScopeId] = useState<string | undefined>();

  const selectedScope = useMemo(() => {
    if (selectedScopeId) return resourceScopes.find((s) => s.scopeId === selectedScopeId);
    return resourceScopes[0];
  }, [resourceScopes, selectedScopeId]);

  if (resourceScopes.length === 0) {
    return <Alert type="warning" message="Bạn không có quyền truy cập resource workspace" showIcon />;
  }

  return (
    <ScopeGuard scopeType={selectedScope!.scopeType} scopeId={selectedScope!.scopeId} permission="resource.view">
      <CtvResourceContent scope={selectedScope!} scopes={resourceScopes} onSwitchScope={setSelectedScopeId} />
    </ScopeGuard>
  );
}

// BE chưa có endpoint resource cho CTV workspace — KHÔNG render dữ liệu giả,
// hiển thị empty-state trung thực cho tới khi BE bổ sung API.
function CtvResourceContent({
  scope,
  scopes,
  onSwitchScope,
}: {
  scope: CtvScope;
  scopes: CtvScope[];
  onSwitchScope: (scopeId: string) => void;
}) {
  return (
    <div>
      <Typography.Title level={3}>Resources ({scope.scopeType}:{scope.scopeName})</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Typography.Text strong>Scope:</Typography.Text>
          <Select
            value={scope.scopeId}
            options={scopes.map((s) => ({ label: `${s.scopeType}:${s.scopeName}`, value: s.scopeId }))}
            onChange={onSwitchScope}
            style={{ width: 240 }}
          />
        </Space>
      </Card>
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={4}>
              <Typography.Text strong>Quản lý resource cho CTV đang phát triển</Typography.Text>
              <Typography.Text type="secondary">
                Backend chưa cung cấp API resource theo scope CTV. Tính năng sẽ mở khi API sẵn sàng.
              </Typography.Text>
            </Space>
          }
        />
      </Card>
    </div>
  );
}
