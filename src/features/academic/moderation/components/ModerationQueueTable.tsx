import { Button, Checkbox, Space, Tooltip, Typography } from "antd";
import type { TableProps } from "antd";
import { CheckOutlined, CloseOutlined, EyeOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { MobileCard } from "../../../../shared/components/MobileCard";
import { ResponsiveTable } from "../../../../shared/components/ResponsiveTable";
import type { PendingResourceSummary } from "../../types";
import { ResourceTypeChip } from "./ResourceTypeChip";

/** Thao tác đang chạy trên MỘT dòng — để chỉ dòng đó quay, không phải cả bảng. */
export interface RowBusyState {
  id: string;
  action: "approve" | "reject";
}

interface ModerationQueueTableProps {
  data: PendingResourceSummary[];
  loading: boolean;
  busy: RowBusyState | null;
  /** true khi đang chạy duyệt hàng loạt — khoá thao tác đơn lẻ để không chồng lệnh. */
  bulkRunning: boolean;
  subjectLabel: (subjectId: string | null) => string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  pagination: { current: number; pageSize: number; total: number };
  onPaginationChange: (page: number, pageSize: number) => void;
  onPreview: (item: PendingResourceSummary) => void;
  onApprove: (item: PendingResourceSummary) => void;
  onReject: (item: PendingResourceSummary) => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}

export function ModerationQueueTable({
  data,
  loading,
  busy,
  bulkRunning,
  subjectLabel,
  selectedIds,
  onSelectionChange,
  pagination,
  onPaginationChange,
  onPreview,
  onApprove,
  onReject,
}: ModerationQueueTableProps) {
  const anyBusy = busy !== null || bulkRunning;

  const columns: TableProps<PendingResourceSummary>["columns"] = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      render: (_: unknown, record) => (
        <Typography.Link onClick={() => onPreview(record)}>{record.title}</Typography.Link>
      ),
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: "Loại",
      dataIndex: "type",
      width: 130,
      render: (_: unknown, record) => <ResourceTypeChip type={record.type} />,
      sorter: (a, b) => a.type.localeCompare(b.type),
    },
    {
      title: "Môn học",
      dataIndex: "subjectId",
      width: 200,
      render: (_: unknown, record) => subjectLabel(record.subjectId),
    },
    {
      // Payload hàng đợi KHÔNG có mốc "gửi duyệt" riêng — `createdAt` là mốc duy nhất BE trả
      // (và cũng là khoá sắp xếp ASC của BE: cũ nhất lên trước).
      title: "Gửi lúc",
      dataIndex: "createdAt",
      width: 170,
      render: (_: unknown, record) => (
        <Tooltip title="Thời điểm tạo học liệu — hàng đợi không trả mốc gửi duyệt riêng">
          {formatDateTime(record.createdAt)}
        </Tooltip>
      ),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: "ascend",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 260,
      render: (_: unknown, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => onPreview(record)}>
            Xem
          </Button>
          <Can permissions={["resource.approve"]}>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              size="small"
              loading={busy?.id === record.id && busy.action === "approve"}
              disabled={anyBusy && !(busy?.id === record.id && busy.action === "approve")}
              onClick={() => onApprove(record)}
            >
              Duyệt
            </Button>
          </Can>
          <Can permissions={["resource.approve"]}>
            <Button
              danger
              icon={<CloseOutlined />}
              size="small"
              loading={busy?.id === record.id && busy.action === "reject"}
              disabled={anyBusy && !(busy?.id === record.id && busy.action === "reject")}
              onClick={() => onReject(record)}
            >
              Từ chối
            </Button>
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <ResponsiveTable<PendingResourceSummary>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => onSelectionChange(keys as string[]),
        getCheckboxProps: () => ({ disabled: bulkRunning }),
      }}
      pagination={{
        // BE `page` là 0-based, AntD `current` là 1-based — quy đổi ở page component.
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50],
        showTotal: (total) => `${total} mục chờ duyệt`,
        onChange: onPaginationChange,
      }}
      // Thẻ giữ lại ô tick chọn: duyệt hàng loạt là cách dùng chính của màn này, mất ô tick trên
      // điện thoại là mất luôn tính năng chứ không chỉ mất một cột.
      renderMobileCard={(record) => {
        const checked = selectedIds.includes(record.id);
        return (
          <MobileCard
            title={record.title}
            subtitle={
              <>
                <ResourceTypeChip type={record.type} /> {subjectLabel(record.subjectId)}
              </>
            }
            meta={[{ label: "Gửi lúc", value: formatDateTime(record.createdAt) }]}
            extra={
              <Checkbox
                checked={checked}
                disabled={bulkRunning}
                aria-label="Chọn để duyệt hàng loạt"
                onChange={(e) =>
                  onSelectionChange(
                    e.target.checked
                      ? [...selectedIds, record.id]
                      : selectedIds.filter((id) => id !== record.id)
                  )
                }
              />
            }
            primaryAction={
              <Button block size="large" icon={<EyeOutlined />} onClick={() => onPreview(record)}>
                Xem nội dung
              </Button>
            }
            actions={
              <Can permissions={["resource.approve"]}>
                <Button
                  type="primary"
                  block
                  icon={<CheckOutlined />}
                  loading={busy?.id === record.id && busy.action === "approve"}
                  disabled={anyBusy && !(busy?.id === record.id && busy.action === "approve")}
                  onClick={() => onApprove(record)}
                >
                  Duyệt
                </Button>
                <Button
                  danger
                  block
                  icon={<CloseOutlined />}
                  loading={busy?.id === record.id && busy.action === "reject"}
                  disabled={anyBusy && !(busy?.id === record.id && busy.action === "reject")}
                  onClick={() => onReject(record)}
                >
                  Từ chối
                </Button>
              </Can>
            }
          />
        );
      }}
    />
  );
}
