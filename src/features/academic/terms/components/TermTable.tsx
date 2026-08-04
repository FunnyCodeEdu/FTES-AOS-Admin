import { Button, Space, Table } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { Can } from "../../../../shared/permissions";
import type { TermView } from "../../types";
import { TermStatusTag } from "./TermStatusTag";

interface TermTableProps {
  data: TermView[];
  loading?: boolean;
  onEdit: (term: TermView) => void;
  onDelete: (term: TermView) => void;
}

function formatRange(startsAt: string, endsAt: string): string {
  return `${dayjs(startsAt).format("DD/MM/YYYY HH:mm")} → ${dayjs(endsAt).format(
    "DD/MM/YYYY HH:mm"
  )}`;
}

export function TermTable({ data, loading, onEdit, onDelete }: TermTableProps) {
  const columns: TableProps<TermView>["columns"] = [
    { title: "Mã kỳ", dataIndex: "code", sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: "Tên kỳ", dataIndex: "name", sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: "Thời gian",
      key: "range",
      render: (_: unknown, record) => formatRange(record.startsAt, record.endsAt),
      sorter: (a, b) => dayjs(a.startsAt).valueOf() - dayjs(b.startsAt).valueOf(),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (_: unknown, record) => <TermStatusTag status={record.status} />,
    },
    {
      title: "Số khoá",
      dataIndex: "courseCount",
      align: "center",
      sorter: (a, b) => a.courseCount - b.courseCount,
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record) => (
        <Space>
          <Link to={`/academic/terms/${record.id}`}>
            <Button icon={<EyeOutlined />} size="small">
              Xem
            </Button>
          </Link>
          <Can permissions={["term.manage"]}>
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)}>
              Sửa
            </Button>
          </Can>
          <Can permissions={["term.manage"]}>
            <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)}>
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
      pagination={{ pageSize: 10, hideOnSinglePage: true }}
    />
  );
}
