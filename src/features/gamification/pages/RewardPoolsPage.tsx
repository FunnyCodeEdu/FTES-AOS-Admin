import { useState } from "react";
import { Alert, Button, Card, Space, Table, Tag, Typography } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import { useRewardPools } from "../api/gamification.api";
import type { RewardPool } from "../api/gamification.api";
import { RewardPoolFormModal } from "../components/RewardPoolFormModal";
import { RewardPoolItemsDrawer } from "../components/RewardPoolItemsDrawer";

export default function RewardPoolsPage() {
  const { data, isLoading, isError, error, refetch } = useRewardPools();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RewardPool | null>(null);
  const [itemsPool, setItemsPool] = useState<RewardPool | null>(null);

  const columns: TableProps<RewardPool>["columns"] = [
    { title: "Mã", dataIndex: "code", fixed: "left", width: 180 },
    { title: "Loại", dataIndex: "type", width: 150, render: (t: string) => <Tag>{t}</Tag> },
    { title: "Loại chi phí", dataIndex: "costType", width: 130 },
    { title: "Chi phí mở", dataIndex: "costAmount", width: 120 },
    {
      title: "Hoạt động",
      dataIndex: "active",
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>{active ? "Bật" : "Tắt"}</Tag>
      ),
    },
    {
      title: "Thao tác",
      fixed: "right",
      width: 190,
      render: (_: unknown, record: RewardPool) => (
        <Space>
          <Button size="small" onClick={() => setItemsPool(record)}>
            Item & xác suất
          </Button>
          <Can permissions={["gamification.admin.manage"]}>
            <Button size="small" onClick={() => { setEditing(record); setFormOpen(true); }}>
              Sửa
            </Button>
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Reward Pools</Typography.Title>
      <Typography.Paragraph type="secondary">
        Cấu hình pool phần thưởng (hộp quà) và các item bên trong. Tổng xác suất các item trong một
        pool phải bằng 1.0 — mở "Item & xác suất" để thêm/xoá item và kiểm tra tổng xác suất.
      </Typography.Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
          <Can permissions={["gamification.admin.manage"]}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditing(null); setFormOpen(true); }}
            >
              Thêm reward pool
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách reward pool"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data ?? []}
        loading={isLoading}
        pagination={false}
        scroll={{ x: 870 }}
      />

      <RewardPoolFormModal
        open={formOpen}
        pool={editing}
        onClose={() => setFormOpen(false)}
      />

      <RewardPoolItemsDrawer pool={itemsPool} onClose={() => setItemsPool(null)} />
    </div>
  );
}
