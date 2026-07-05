import { Card, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { CtvScope } from "../shared/types";

interface ScopeCardProps {
  scope: CtvScope;
  onClick?: () => void;
}

export function ScopeCard({ scope, onClick }: ScopeCardProps) {
  const daysLeft = scope.expiresAt ? dayjs(scope.expiresAt).diff(dayjs(), "day") : Infinity;
  const nearExpiry = typeof daysLeft === "number" && daysLeft < 7;

  return (
    <Card hoverable={!!onClick} onClick={onClick} style={{ marginBottom: 12 }}>
      <Typography.Title level={5}>{scope.scopeName}</Typography.Title>
      <Typography.Text type="secondary">{scope.scopeType}</Typography.Text>
      <div>
        {scope.permissions.map((p) => (
          <Tag key={p} style={{ marginTop: 8 }}>{p}</Tag>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        {nearExpiry ? (
          <Tag color="orange">Hết hạn sau {daysLeft} ngày</Tag>
        ) : (
          <Typography.Text type="secondary">Hết hạn: {scope.expiresAt ? dayjs(scope.expiresAt).format("DD/MM/YYYY") : "—"}</Typography.Text>
        )}
      </div>
    </Card>
  );
}
