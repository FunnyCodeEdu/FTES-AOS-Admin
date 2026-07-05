import { useMemo, useState } from "react";
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import { Can } from "../../../shared/permissions";
import { useCtvScopes } from "../api/ctvMe.api";
import { ScopeGuard } from "../components/ScopeGuard";
import type { CtvScope } from "../shared/types";

const mockResources = [
  { id: "res-1", title: "Bài tập Toán 12", status: "pending", subject: "Toán" },
  { id: "res-2", title: "Đề thi thử", status: "active", subject: "Toán" },
];

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

function CtvResourceContent({
  scope,
  scopes,
  onSwitchScope,
}: {
  scope: CtvScope;
  scopes: CtvScope[];
  onSwitchScope: (scopeId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = mockResources.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Typography.Title level={3}>Resources ({scope.scopeType}:{scope.scopeName})</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input placeholder="Tìm resource" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button>Upload</Button>
        </Space>
      </Card>
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
      <Table
        rowKey="id"
        dataSource={filtered}
        columns={[
          { title: "Tiêu đề", dataIndex: "title" },
          { title: "Môn", dataIndex: "subject" },
          { title: "Trạng thái", dataIndex: "status", render: (s: string) => <Tag>{s}</Tag> },
          {
            title: "Thao tác",
            render: () => (
              <Space>
                <Button size="small">Sửa</Button>
                <Can
                  permissions={["resource.approve"]}
                  scope={{ permission: "resource.approve", type: scope.scopeType, id: scope.scopeId }}
                >
                  <Button size="small" type="primary">Duyệt</Button>
                </Can>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
