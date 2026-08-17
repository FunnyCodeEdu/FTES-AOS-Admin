import { Button, Popconfirm, Space, Table, Tag } from "antd";
import { CloudUploadOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Link } from "react-router-dom";
import { Can } from "../../../../shared/permissions";
import { RESOURCE_VISIBILITY_LABELS } from "../constants";
import type { Resource, ResourceStatus, ResourceVisibility } from "../../types";

interface ResourceTableProps {
  data: Resource[];
  loading?: boolean;
  pagination: TableProps<Resource>["pagination"];
  onChange: TableProps<Resource>["onChange"];
  onDelete: (resource: Resource) => void;
  /** Đưa ra mắt (DRAFT/chờ duyệt → APPROVED). Không truyền = ẩn nút. */
  onPublish?: (resource: Resource) => void;
  publishingId?: string | null;
}

const statusLabels: Record<ResourceStatus, { text: string; color: string }> = {
  pending: { text: "Chờ duyệt", color: "orange" },
  approved: { text: "Đã duyệt", color: "green" },
  rejected: { text: "Từ chối", color: "red" },
};

// Nhãn visibility dùng chung (Contract B) — nguồn duy nhất tại resources/constants.ts.
const visibilityLabels = RESOURCE_VISIBILITY_LABELS;

export function ResourceTable({
  data,
  loading,
  pagination,
  onChange,
  onDelete,
  onPublish,
  publishingId,
}: ResourceTableProps) {
  const columns: TableProps<Resource>["columns"] = [
    { title: "Tên học liệu", dataIndex: "title", sorter: true },
    { title: "Môn", dataIndex: "subjectName" },
    { title: "Loại", dataIndex: "type" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: ResourceStatus) => {
        const entry =
          statusLabels[status] ??
          statusLabels[status?.toLowerCase?.() as ResourceStatus] ??
          { text: String(status ?? ""), color: "default" };
        return <Tag color={entry.color}>{entry.text}</Tag>;
      },
    },
    {
      title: "Visibility",
      dataIndex: "visibility",
      render: (v: ResourceVisibility) =>
        visibilityLabels[v] ?? visibilityLabels[v?.toLowerCase?.() as ResourceVisibility] ?? String(v ?? ""),
    },
    { title: "Phiên bản", dataIndex: "currentVersion" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: Resource) => (
        <Space>
          <Link to={`/academic/resources/${record.id}`}>
            <Button icon={<EyeOutlined />} size="small">
              Xem
            </Button>
          </Link>
          {/*
            So sánh KHÔNG phân biệt hoa/thường: `adminResources` của GraphQL trả status THÔ của BE
            (`DRAFT`/`APPROVED`), còn REST detail trả nhãn đã map (`approved`). Cùng một cột nhận
            hai dạng, nên so thẳng với chuỗi thường sẽ hiện nút "Đưa ra mắt" trên chính học liệu đã
            ra mắt — bấm vào thì BE từ chối và người dùng thấy một lỗi không giải thích được.
          */}
          {onPublish && (record.status ?? "").toLowerCase() !== "approved" && (
            <Can permissions={["admin.resource.manage"]}>
              {/*
                Xác nhận trước khi đưa ra mắt: từ lúc này học viên thấy được nội dung, và một bộ đề
                lỡ công khai thì không thu lại được bằng cách bấm nút — người đã tải là đã tải.
              */}
              <Popconfirm
                title="Đưa học liệu này ra mắt?"
                description="Học viên đủ điều kiện sẽ thấy được ngay sau khi duyệt."
                okText="Đưa ra mắt"
                cancelText="Huỷ"
                onConfirm={() => onPublish(record)}
              >
                <Button
                  icon={<CloudUploadOutlined />}
                  type="primary"
                  size="small"
                  loading={publishingId === record.id}
                >
                  Đưa ra mắt
                </Button>
              </Popconfirm>
            </Can>
          )}
          <Can permissions={["admin.resource.manage"]}>
            <Button icon={<DeleteOutlined />} danger size="small" onClick={() => onDelete(record)}>
              Xoá
            </Button>
          </Can>
        </Space>
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
