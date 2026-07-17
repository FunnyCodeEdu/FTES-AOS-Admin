import { useState } from "react";
import { Alert, Button, Card, Empty, Modal, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import { useCloseSeason, useSeasons } from "../api/gamification.api";
import type { Season } from "../api/gamification.api";
import { SeasonFormModal } from "../components/SeasonFormModal";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  RUNNING: "green",
  PENDING_CLOSE: "orange",
  CLOSED: "red",
};

function formatInstant(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function SeasonsPage() {
  const { data, isLoading, isError, error, refetch } = useSeasons();
  const closeSeason = useCloseSeason();
  const [formOpen, setFormOpen] = useState(false);

  function handleClose(season: Season) {
    Modal.confirm({
      title: `Đóng season ${season.code}?`,
      content:
        "Season sẽ chuyển sang PENDING_CLOSE, sau đó hệ thống snapshot bảng xếp hạng rồi mới đặt CLOSED. Không thể hoàn tác.",
      okText: "Đóng season",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () =>
        closeSeason.mutate(season.id, {
          onSuccess: () => message.success("Đã yêu cầu đóng season"),
        }),
    });
  }

  const columns: TableProps<Season>["columns"] = [
    { title: "Mã", dataIndex: "code", fixed: "left", width: 160 },
    {
      title: "Bắt đầu",
      dataIndex: "startsAt",
      width: 190,
      render: (v: string) => formatInstant(v),
    },
    {
      title: "Kết thúc",
      dataIndex: "endsAt",
      width: 190,
      render: (v: string) => formatInstant(v),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 140,
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "Thao tác",
      fixed: "right",
      width: 140,
      render: (_: unknown, record: Season) =>
        record.status === "CLOSED" ? (
          <Typography.Text type="secondary">Đã đóng</Typography.Text>
        ) : (
          <Can permissions={["gamification.admin.manage"]}>
            <Button
              size="small"
              danger
              // Gate loading on the ROW being closed (variables = season id), not the
              // shared hook's global isPending — otherwise closing one season spins
              // every row's button (consistent with Quests/XpRules row-level gating).
              loading={closeSeason.isPending && closeSeason.variables === record.id}
              onClick={() => handleClose(record)}
            >
              Đóng season
            </Button>
          </Can>
        ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Seasons</Typography.Title>
      <Typography.Paragraph type="secondary">
        Quản lý mùa giải (season) của bảng xếp hạng. Tạo season mới và đóng season khi kết thúc —
        đóng season sẽ snapshot bảng xếp hạng trước khi chuyển sang CLOSED.
      </Typography.Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
          <Can permissions={["gamification.admin.manage"]}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
              Tạo season
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách season"
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
        scroll={{ x: 820 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có season nào — tạo season đầu tiên để bắt đầu bảng xếp hạng theo mùa."
            />
          ),
        }}
      />

      <SeasonFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
