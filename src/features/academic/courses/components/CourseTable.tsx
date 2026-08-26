import { Button, Dropdown, Space, Tag } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { Can } from "../../../../shared/permissions";
import { MobileCard } from "../../../../shared/components/MobileCard";
import { ResponsiveTable } from "../../../../shared/components/ResponsiveTable";
import type { Course, CourseStatus, CourseType } from "../../types";

interface CourseTableProps {
  data: Course[];
  loading?: boolean;
  pagination: TableProps<Course>["pagination"];
  onChange: TableProps<Course>["onChange"];
  onEdit: (course: Course) => void;
  onGrant: (course: Course) => void;
  onDelete: (course: Course) => void;
}

const statusLabels: Record<CourseStatus, { text: string; color: string }> = {
  draft: { text: "Nháp", color: "default" },
  review: { text: "Chờ duyệt", color: "orange" },
  published: { text: "Đã publish", color: "green" },
  archived: { text: "Lưu trữ", color: "gray" },
};

function statusEntry(status: CourseStatus) {
  return (
    statusLabels[status] ??
    statusLabels[status?.toLowerCase?.() as CourseStatus] ?? {
      text: String(status ?? ""),
      color: "default",
    }
  );
}

function formatPrice(value?: number): string {
  return value != null ? `${value.toLocaleString("vi-VN")}đ` : "—";
}

export function CourseTable({ data, loading, pagination, onChange, onEdit, onGrant, onDelete }: CourseTableProps) {
  const navigate = useNavigate();

  const columns: TableProps<Course>["columns"] = [
    { title: "Tên khoá học", dataIndex: "name", sorter: true },
    { title: "Môn học", dataIndex: "subjectName" },
    {
      title: "Loại",
      dataIndex: "saleMode",
      render: (mode?: CourseType) =>
        mode ? <Tag color={mode === "PACKAGE" ? "blue" : "default"}>{mode}</Tag> : "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "workflowStatus",
      render: (status: CourseStatus) => {
        const entry = statusEntry(status);
        return <Tag color={entry.color}>{entry.text}</Tag>;
      },
    },
    { title: "Giá", dataIndex: "basePrice", render: (v?: number) => formatPrice(v) },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: Course) => (
        <Space>
          <Link to={`/academic/courses/${record.id}`}>
            <Button icon={<EyeOutlined />} size="small">
              Xem
            </Button>
          </Link>
          <Can permissions={["course.manage"]}>
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)}>
              Sửa
            </Button>
          </Can>
          <Can permissions={["course.manage"]}>
            <Button
              icon={<UsergroupAddOutlined />}
              size="small"
              onClick={() => onGrant(record)}
            >
              Cấp học viên
            </Button>
          </Can>
          <Can permissions={["course.manage"]}>
            <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)}>
              Xoá
            </Button>
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <ResponsiveTable<Course>
      // Desktop giữ nguyên bảng cũ: hàng thao tác rộng hơn khung nên vẫn cuộn ngang trong bảng.
      scroll={{ x: "max-content" }}
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      onChange={onChange}
      // Điện thoại: mỗi khoá là một thẻ, "Cấp học viên" là nút chính full-width đứng trước mọi thứ
      // khác — đó là việc mentor mở trang này để làm. Xoá đẩy vào menu "…" cho phải với xa hơn.
      renderMobileCard={(course) => {
        const entry = statusEntry(course.workflowStatus);
        return (
          <MobileCard
            title={course.name}
            subtitle={
              <>
                <Tag color={entry.color} style={{ marginInlineEnd: 6 }}>
                  {entry.text}
                </Tag>
                {course.subjectName || "Chưa gắn môn"}
              </>
            }
            meta={[
              { label: "Giá", value: formatPrice(course.basePrice) },
              {
                label: "Kiểu bán",
                value: course.saleMode === "PACKAGE" ? "Theo gói" : "Trọn khoá",
              },
            ]}
            extra={
              <Can permissions={["course.manage"]}>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      { key: "edit", icon: <EditOutlined />, label: "Sửa khoá học" },
                      { key: "delete", icon: <DeleteOutlined />, label: "Xoá khoá học", danger: true },
                    ],
                    onClick: ({ key }) => {
                      if (key === "edit") onEdit(course);
                      if (key === "delete") onDelete(course);
                    },
                  }}
                >
                  <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác khác" />
                </Dropdown>
              </Can>
            }
            primaryAction={
              <Can permissions={["course.manage"]}>
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<UsergroupAddOutlined />}
                  onClick={() => onGrant(course)}
                >
                  Thêm học viên
                </Button>
              </Can>
            }
            actions={
              <Button block onClick={() => navigate(`/academic/courses/${course.id}`)}>
                Mở khoá học
              </Button>
            }
          />
        );
      }}
    />
  );
}
