import { Select, Space, Typography } from "antd";
import { useModerationScopes } from "../hooks/useModerationScopes";

export function ScopePicker() {
  const { activeScopes, selectedScopeId, setSelectedScopeId } = useModerationScopes();

  if (activeScopes.length < 2) return null;

  return (
    <Space>
      <Typography.Text>Scope:</Typography.Text>
      <Select
        value={selectedScopeId ?? undefined}
        allowClear
        placeholder="Tất cả scope"
        options={activeScopes.map((scopeId) => ({ label: scopeId, value: scopeId }))}
        onChange={(value) => setSelectedScopeId(value ?? null)}
        style={{ width: 200 }}
      />
    </Space>
  );
}
