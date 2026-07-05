import { useEffect, useMemo, useState } from "react";
import { Card, Skeleton, Typography, Button, Empty, Row, Col, Statistic, Select, Space, List, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../../../features/auth/api";
import { useContributionStats } from "../api/analytics.api";
import type { ScopedGrant } from "../../../features/auth/store";
import type { DateRange } from "../shared/types";
import type { ContributionRecentActivity } from "../shared/types";

interface ActiveScope {
  scopeType: string;
  scopeId: string;
}

function getContributionScopes(grants: ScopedGrant[]): ActiveScope[] {
  const now = new Date();
  const map = new Map<string, ActiveScope>();
  for (const g of grants) {
    if (g.permission !== "analytics.view.contribution") continue;
    if (g.expiresAt && new Date(g.expiresAt) <= now) continue;
    if (!g.scopeType || !g.scopeId) continue;
    const key = `${g.scopeType}:${g.scopeId}`;
    if (!map.has(key)) {
      map.set(key, { scopeType: g.scopeType, scopeId: g.scopeId });
    }
  }
  return Array.from(map.values());
}

function statusColor(status: ContributionRecentActivity["status"]) {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "error";
    case "pending":
    default:
      return "warning";
  }
}

function statusLabel(status: ContributionRecentActivity["status"]) {
  switch (status) {
    case "approved":
      return "Đã duyệt";
    case "rejected":
      return "Từ chối";
    case "pending":
    default:
      return "Chờ duyệt";
  }
}

interface ContributionWidgetProps {
  range: DateRange;
}

export function ContributionWidget({ range }: ContributionWidgetProps) {
  const { data: me } = useMe();
  const scopes = useMemo(() => getContributionScopes(me?.scopedGrants ?? []), [me?.scopedGrants]);
  const [activeScope, setActiveScope] = useState<ActiveScope | null>(null);

  // Auto-select the only scope; reset to first scope if current selection disappears.
  useEffect(() => {
    if (scopes.length === 0) {
      setActiveScope(null);
    } else if (!activeScope || !scopes.some((s) => s.scopeType === activeScope.scopeType && s.scopeId === activeScope.scopeId)) {
      setActiveScope(scopes[0]);
    }
  }, [scopes, activeScope]);

  const { data, isLoading, isError, error, refetch } = useContributionStats(
    activeScope?.scopeType ?? "",
    activeScope?.scopeId ?? "",
    range
  );

  if (scopes.length === 0) {
    return (
      <Card title="Đóng góp CTV">
        <Empty description="Bạn chưa được cấp scope đóng góp" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  return (
    <Card
      title="Đóng góp CTV"
      extra={
        scopes.length > 1 && (
          <Select
            value={`${activeScope?.scopeType}:${activeScope?.scopeId}`}
            onChange={(value) => {
              const [scopeType, scopeId] = value.split(":");
              setActiveScope({ scopeType, scopeId });
            }}
            options={scopes.map((s) => ({
              value: `${s.scopeType}:${s.scopeId}`,
              label: `${s.scopeType} / ${s.scopeId}`,
            }))}
            style={{ minWidth: 180 }}
          />
        )
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} title={{ width: "50%" }} />
      ) : isError || !data ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error?.message ?? "Lỗi tải dữ liệu"}>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        </Empty>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Statistic title="Đã duyệt" value={data.approved} />
            </Col>
            <Col span={8}>
              <Statistic title="Từ chối" value={data.rejected} />
            </Col>
            <Col span={8}>
              <Statistic title="Chờ duyệt" value={data.pending} />
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <Typography.Text type="secondary">Hoạt động gần đây:</Typography.Text>
            <List
              size="small"
              dataSource={data.recentActivity}
              locale={{ emptyText: "Không có hoạt động" }}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <Typography.Text ellipsis style={{ maxWidth: 200 }}>
                      {item.title}
                    </Typography.Text>
                    <Tag color={statusColor(item.status)}>{statusLabel(item.status)}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        </>
      )}
    </Card>
  );
}
