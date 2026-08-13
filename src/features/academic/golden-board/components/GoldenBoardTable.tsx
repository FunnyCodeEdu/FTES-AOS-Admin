import { Avatar, Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EditOutlined, LinkOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import { resolvedDisplayName, resolvedPhotoUrl, type GoldenBoardEntry } from "../types";

interface GoldenBoardTableProps {
  data: GoldenBoardEntry[];
  loading?: boolean;
  pagination: TableProps<GoldenBoardEntry>["pagination"];
  onChange: TableProps<GoldenBoardEntry>["onChange"];
  onEdit: (entry: GoldenBoardEntry) => void;
  onDelete: (entry: GoldenBoardEntry) => void;
}

export function GoldenBoardTable({
  data,
  loading,
  pagination,
  onChange,
  onEdit,
  onDelete,
}: GoldenBoardTableProps) {
  const columns: TableProps<GoldenBoardEntry>["columns"] = [
    { title: "Hạng", dataIndex: "rank", width: 80 },
    {
      title: "Ảnh",
      key: "photo",
      width: 72,
      // Hiện ĐÚNG ảnh sẽ lên trang chủ (field đã lưu thắng, avatar profile chỉ bù chỗ trống).
      render: (_: unknown, record: GoldenBoardEntry) => (
        <Avatar src={resolvedPhotoUrl(record)} shape="square" size={40}>
          {resolvedDisplayName(record).charAt(0).toUpperCase()}
        </Avatar>
      ),
    },
    {
      title: "Tên hiển thị",
      key: "displayName",
      render: (_: unknown, record: GoldenBoardEntry) => (
        <div>
          <Typography.Text strong>{resolvedDisplayName(record)}</Typography.Text>
          {record.userId ? (
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
              <Tooltip title={`Đang gắn tài khoản ${record.userId}`}>
                <Space size={4}>
                  <LinkOutlined />
                  {record.linkedUsername
                    ? `@${record.linkedUsername}`
                    : record.linkedDisplayName || "tài khoản đã gắn"}
                </Space>
              </Tooltip>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>Không gắn tài khoản</div>
          )}
        </div>
      ),
    },
    {
      title: "Dòng giới thiệu",
      dataIndex: "headline",
      render: (headline: string | null) => headline || "—",
    },
    {
      title: "Chip",
      dataIndex: "badgeLabel",
      render: (badgeLabel: string | null) =>
        badgeLabel ? <Tag color="gold">{badgeLabel}</Tag> : "—",
    },
    {
      title: "Thành tích",
      dataIndex: "lines",
      render: (lines: string[]) =>
        lines.length === 0 ? (
          "—"
        ) : (
          <Space direction="vertical" size={0}>
            {lines.map((line, idx) => (
              <Typography.Text key={`${line}-${idx}`} style={{ fontSize: 12 }}>
                • {line}
              </Typography.Text>
            ))}
          </Space>
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "active",
      width: 110,
      render: (active: boolean) =>
        active ? <Tag color="green">Đang hiện</Tag> : <Tag>Đã ẩn</Tag>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      render: (_: unknown, record: GoldenBoardEntry) => (
        <Can permissions={["goldenboard.manage"]}>
          <Space>
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)}>
              Sửa
            </Button>
            <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)}>
              Xoá
            </Button>
          </Space>
        </Can>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      onChange={onChange}
    />
  );
}
