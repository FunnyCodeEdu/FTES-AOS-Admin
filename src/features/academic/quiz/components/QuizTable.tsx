import { Button, Space, Table, Tag } from "antd";
import { DeleteOutlined, EditOutlined, RobotOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import type { QuizDifficulty, QuizQuestion, QuizStatus } from "../../types";

interface QuizTableProps {
  data: QuizQuestion[];
  loading?: boolean;
  pagination: TableProps<QuizQuestion>["pagination"];
  onChange: TableProps<QuizQuestion>["onChange"];
  onEdit: (question: QuizQuestion) => void;
  onDelete: (question: QuizQuestion) => void;
  /** Mở drawer phân tích độ khó AI cho câu hỏi (gate ai.teacher.use). */
  onAnalyzeDifficulty?: (question: QuizQuestion) => void;
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

export function QuizTable({
  data,
  loading,
  pagination,
  onChange,
  onEdit,
  onDelete,
  onAnalyzeDifficulty,
}: QuizTableProps) {
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
      render: (_: unknown, record: QuizQuestion) => (
        <Space>
          <Can permissions={["course.manage"]}>
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)}>
              Sửa
            </Button>
          </Can>
          <Can permissions={["course.manage"]}>
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
              disabled={record.status === "archived"}
              onClick={() => onDelete(record)}
            >
              Lưu trữ
            </Button>
          </Can>
          {onAnalyzeDifficulty && (
            <Can permissions={["ai.teacher.use"]}>
              <Button
                icon={<RobotOutlined />}
                size="small"
                onClick={() => onAnalyzeDifficulty(record)}
              >
                Độ khó AI
              </Button>
            </Can>
          )}
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
