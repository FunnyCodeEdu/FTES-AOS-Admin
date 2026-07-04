import { useEffect } from "react";
import { Select, Space, Typography } from "antd";
import { useMe } from "../../auth/api";
import { useCtvScopeStore } from "../store/ctvScopeStore";

export function ScopePicker() {
  const { data: me } = useMe();
  const scopes = useCtvScopeStore((s) => s.scopes);
  const activeScopeId = useCtvScopeStore((s) => s.activeScopeId);
  const initFromGrants = useCtvScopeStore((s) => s.initFromGrants);
  const setActiveScope = useCtvScopeStore((s) => s.setActiveScope);

  useEffect(() => {
    if (me?.scopedGrants) {
      initFromGrants(me.scopedGrants);
    }
  }, [me?.scopedGrants, initFromGrants]);

  if (scopes.length <= 1) return null;

  return (
    <Space>
      <Typography.Text type="secondary">Phạm vi môn:</Typography.Text>
      <Select
        value={activeScopeId ?? undefined}
        onChange={(value) => setActiveScope(value)}
        options={scopes.map((s) => ({ value: s.scopeId, label: s.name }))}
        style={{ minWidth: 180 }}
        placeholder="Chọn môn"
      />
    </Space>
  );
}
