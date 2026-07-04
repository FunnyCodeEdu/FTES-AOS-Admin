import { Link } from "react-router-dom";
import { Alert, Badge, Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { TableProps } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useCanManageCourse } from "../hooks/useCanManageCourse";
import { useLessonContent, useLessonPreview } from "../api/lessons.api";
import type { CourseDetail, CourseTreeNode } from "../../types";
import type { LessonType } from "../types";

interface LessonListTabProps {
  course: CourseDetail;
}

interface LessonRow {
  id: string;
  title: string;
  type: LessonType;
  path: string;
}

function extractLessons(nodes: CourseTreeNode[], path = ""): LessonRow[] {
  const rows: LessonRow[] = [];
  for (const node of nodes) {
    const currentPath = path ? `${path} > ${node.title}` : node.title;
    if (node.type === "lesson" || node.type === "assignment") {
      const inferredType: LessonType =
        node.lessonType ?? (node.type === "assignment" ? "ASSIGNMENT" : "DOCUMENT");
      rows.push({
        id: node.id ?? node.key,
        title: node.title,
        type: inferredType,
        path: currentPath,
      });
    }
    if (node.children) {
      rows.push(...extractLessons(node.children, currentPath));
    }
  }
  return rows;
}

function formatMmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ContentBadge({ lessonId, type, emptyLabel }: { lessonId: string; type: LessonType; emptyLabel: string }) {
  const { data: content } = useLessonContent(lessonId, type);
  if (type !== "DOCUMENT" || !content || content.hasContent) return null;
  return <Badge status="warning" text={emptyLabel} />;
}

function PreviewTooltip({ lessonId, type }: { lessonId: string; type: LessonType }) {
  const { data: preview } = useLessonPreview(lessonId, type);
  if (type !== "VIDEO" || !preview) return null;
  const inherited = preview.previewSeconds === null;
  const label = inherited
    ? `Học thử ${formatMmss(preview.effectivePreviewSeconds)} · kế thừa`
    : `Học thử ${formatMmss(preview.effectivePreviewSeconds)} · ghi đè`;
  return (
    <Tooltip title={label}>
      <Tag>{label}</Tag>
    </Tooltip>
  );
}

export function LessonListTab({ course }: LessonListTabProps) {
  const canManage = useCanManageCourse(course.id);
  const lessons = extractLessons(course.tree ?? []);

  const columns: TableProps<LessonRow>["columns"] = [
    { title: "Bài học", dataIndex: "title" },
    { title: "Vị trí", dataIndex: "path" },
    {
      title: "Trạng thái",
      render: (_: unknown, record: LessonRow) => (
        <Space>
          <ContentBadge lessonId={record.id} type={record.type} emptyLabel="Chưa có nội dung" />
          <PreviewTooltip lessonId={record.id} type={record.type} />
        </Space>
      ),
    },
    {
      title: "Thao tác",
      render: (_: unknown, record: LessonRow) => (
        <Link to={`/academic/courses/${course.id}/lessons/${record.id}`}>
          <Button icon={<EditOutlined />} size="small">
            {canManage ? "Soạn" : "Xem"}
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={5}>Danh sách bài học</Typography.Title>
      {!canManage && (
        <Alert
          type="info"
          message="Chế độ chỉ đọc"
          description="Bạn không có quyền chỉnh sửa khoá học này."
          style={{ marginBottom: 16 }}
        />
      )}
      <Table rowKey="id" dataSource={lessons} columns={columns} pagination={false} />
    </div>
  );
}
