import { Button, Space, Table, Tag } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import type { CourseCategory } from "../types";

interface CategoryTableProps {
  data: CourseCategory[];
  loading?: boolean;
  pagination: TableProps<CourseCategory>["pagination"];
  onChange: TableProps<CourseCategory>["onChange"];
  onEdit: (category: CourseCategory) => void;
  onDelete: (category: CourseCategory) => void;
}

export function CategoryTable({
  data,
  loading,
  pagination,
  onChange,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  const columns: TableProps<CourseCategory>["columns"] = [
    { title: "Tên danh mục", dataIndex: "name" },
    { title: "Slug", dataIndex: "slug" },
    {
      title: "Số khoá học",
      dataIndex: "courseCount",
      render: (count: number | undefined) => <Tag>{count ?? 0}</Tag>,
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: CourseCategory) => (
        <Can permissions={["course.category.manage"]}>
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
