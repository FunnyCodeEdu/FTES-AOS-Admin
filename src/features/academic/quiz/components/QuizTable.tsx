import { Button, Space, Table, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import { QUIZ_WRITE_UNSUPPORTED_HINT } from "../api/quiz.api";
import type { QuizDifficulty, QuizQuestion, QuizStatus } from "../../types";

interface QuizTableProps {
  data: QuizQuestion[];
  loading?: boolean;
  pagination: TableProps<QuizQuestion>["pagination"];
  onChange: TableProps<QuizQuestion>["onChange"];
  onEdit: (question: QuizQuestion) => void;
  onDelete: (question: QuizQuestion) => void;
}

const difficultyColors: Record<QuizDifficulty, string> = {
  easy: "green",
  medium: "orange",
  hard: "red",
};

const statusColors: Record<QuizStatus, string> = {
  draft: "default",
  ready: "green",
  archived: "gray",
};

export function QuizTable({ data, loading, pagination, onChange, onEdit, onDelete }: QuizTableProps) {
  const columns: TableProps<QuizQuestion>["columns"] = [
    { title: "Nội dung", dataIndex: "content", ellipsis: true, sorter: true },
    { title: "Môn", dataIndex: "subjectName" },
    {
      title: "Độ khó",
      dataIndex: "difficulty",
      render: (d: QuizDifficulty) => (
        <Tag color={difficultyColors[d] ?? difficultyColors[d?.toLowerCase?.() as QuizDifficulty] ?? "default"}>
          {String(d ?? "")}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s: QuizStatus) => (
        <Tag color={statusColors[s] ?? statusColors[s?.toLowerCase?.() as QuizStatus] ?? "default"}>
          {String(s ?? "")}
        </Tag>
      ),
    },
    { title: "Tags", dataIndex: "tags", render: (tags: string[]) => tags.map((t) => <Tag key={t}>{t}</Tag>) },
    {
      title: "Thao tác",
      key: "actions",
      // BE chưa có mutation quiz-questions (chỉ GET) — disable nút ghi, xem quiz.api.ts.
      render: (_: unknown, record: QuizQuestion) => (
        <Space>
          <Can permissions={["course.manage"]}>
            <Tooltip title={QUIZ_WRITE_UNSUPPORTED_HINT}>
              <Button icon={<EditOutlined />} size="small" disabled onClick={() => onEdit(record)}>
                Sửa
              </Button>
            </Tooltip>
          </Can>
          <Can permissions={["course.manage"]}>
            <Tooltip title={QUIZ_WRITE_UNSUPPORTED_HINT}>
              <Button
                icon={<DeleteOutlined />}
                danger
                size="small"
                disabled
                onClick={() => onDelete(record)}
              >
                Xoá
              </Button>
            </Tooltip>
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
