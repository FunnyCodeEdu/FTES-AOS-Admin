import { Button, Dropdown, Space, Tag } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { Can } from "../../../../shared/permissions";
import { MobileCard } from "../../../../shared/components/MobileCard";
import { ResponsiveTable } from "../../../../shared/components/ResponsiveTable";
import type { Subject, SubjectStatus } from "../../types";

interface SubjectTableProps {
  data: Subject[];
  loading?: boolean;
  pagination: TableProps<Subject>["pagination"];
  onChange: TableProps<Subject>["onChange"];
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
}

const statusLabels: Record<SubjectStatus, { text: string; color: string }> = {
  active: { text: "Hoạt động", color: "green" },
  inactive: { text: "Ngừng", color: "orange" },
  draft: { text: "Nháp", color: "default" },
};

function statusEntry(status: SubjectStatus) {
  return (
    statusLabels[status] ??
    statusLabels[status?.toLowerCase?.() as SubjectStatus] ?? {
      text: String(status ?? ""),
      color: "default",
    }
  );
}

export function SubjectTable({ data, loading, pagination, onChange, onEdit, onDelete }: SubjectTableProps) {
  const navigate = useNavigate();
  const columns: TableProps<Subject>["columns"] = [
    { title: "Mã môn", dataIndex: "code", sorter: true },
    { title: "Tên môn", dataIndex: "name", sorter: true },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: SubjectStatus) => {
        const entry = statusEntry(status);
        return <Tag color={entry.color}>{entry.text}</Tag>;
      },
    },
    {
      title: "Nhân sự",
      render: (_: unknown, record: Subject) =>
        `${record.lecturerIds.length} GV · ${record.moderatorIds.length} Moderator`,
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: Subject) => (
        <Space>
          <Link to={`/academic/subjects/${record.id}`}>
            <Button icon={<EyeOutlined />} size="small">
              Xem
            </Button>
          </Link>
          <Can permissions={["subject.manage"]}>
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)}>
              Sửa
            </Button>
          </Can>
          <Can permissions={["subject.manage"]}>
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => onDelete(record)}
            >
              Xoá
            </Button>
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <ResponsiveTable<Subject>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      onChange={onChange}
      renderMobileCard={(subject) => {
        const entry = statusEntry(subject.status);
        return (
          <MobileCard
            title={`${subject.code} · ${subject.name}`}
            subtitle={<Tag color={entry.color}>{entry.text}</Tag>}
            meta={[
              { label: "Giảng viên", value: `${subject.lecturerIds.length} người` },
              { label: "Moderator", value: `${subject.moderatorIds.length} người` },
            ]}
            extra={
              <Can permissions={["subject.manage"]}>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      { key: "edit", icon: <EditOutlined />, label: "Sửa môn học" },
                      { key: "delete", icon: <DeleteOutlined />, label: "Xoá môn học", danger: true },
                    ],
                    onClick: ({ key }) => {
                      if (key === "edit") onEdit(subject);
                      if (key === "delete") onDelete(subject);
                    },
                  }}
                >
                  <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác khác" />
                </Dropdown>
              </Can>
            }
            primaryAction={
              <Button
                block
                size="large"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/academic/subjects/${subject.id}`)}
              >
                Mở môn học
              </Button>
            }
          />
        );
      }}
    />
  );
}
