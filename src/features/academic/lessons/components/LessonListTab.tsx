import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { TableProps } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FolderAddOutlined,
  HolderOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
import { useCanManageCourse } from "../hooks/useCanManageCourse";
import { useLessonContent, useLessonPreview } from "../api/lessons.api";
import { useCourseLessonsKnowledge } from "../api/lessonKnowledge.api";
import { KnowledgeStatusTag } from "./LessonKnowledgeBadge";
import { useSaveCourseTree } from "../../courses/api/courses.api";
import { useCourseTreeDraftStore } from "../../courses/store/courseTreeDraftStore";
import { LessonContentDrawer } from "../../courses/components/LessonContentDrawer";
import { NewLessonModal } from "./NewLessonModal";
import type { CourseDetail, CourseTreeNode } from "../../types";
import type { LessonType } from "../types";

interface LessonListTabProps {
  course: CourseDetail;
}

interface LessonRow {
  key: string;
  id?: string;
  title: string;
  description?: string | null;
  type: LessonType;
  index: number;
  siblingCount: number;
}

function inferLessonType(node: CourseTreeNode): LessonType {
  return node.lessonType ?? (node.type === "assignment" ? "ASSIGNMENT" : "DOCUMENT");
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

/**
 * Row kéo-thả của bảng bài học. Dùng HTML5 drag native (không thêm dependency): mỗi <tr> mang
 * `data-row-key` do AntD gắn sẵn, kéo thả trong CÙNG một chương → gọi `onDropRow(dragKey, dropKey)`.
 * Thứ tự mới nằm ở draft store, chỉ xuống BE khi bấm "Lưu thay đổi" (như nút mũi tên lên/xuống).
 */
function DraggableRow({
  onDropRow,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & {
  "data-row-key"?: string;
  onDropRow: (dragKey: string, dropKey: string) => void;
}) {
  const rowKey = props["data-row-key"];
  const [over, setOver] = useState(false);
  if (!rowKey) return <tr {...props} />;
  return (
    <tr
      {...props}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", rowKey)}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const dragKey = e.dataTransfer.getData("text/plain");
        if (dragKey && dragKey !== rowKey) onDropRow(dragKey, rowKey);
      }}
      style={{ ...props.style, cursor: "move", ...(over ? { background: "#e6f4ff" } : {}) }}
    />
  );
}

/**
 * Vị trí thả cho `moveNode`: kéo LÊN (chỉ số nguồn lớn hơn đích) = chèn TRƯỚC target (-1), kéo
 * XUỐNG = chèn SAU (+1). Sai dấu thì node luôn rơi lệch một ô so với chỗ người dùng thả.
 */
export function dropPositionFor(dragIndex: number, dropIndex: number): -1 | 1 {
  return dragIndex > dropIndex ? -1 : 1;
}

/** Tìm mảng anh-em chứa `key` (top-level = section; con của section = lesson). */
function findSiblings(tree: CourseTreeNode[], key: string): CourseTreeNode[] | null {
  if (tree.some((n) => n.key === key)) return tree;
  for (const n of tree) {
    if (n.children) {
      const found = findSiblings(n.children, key);
      if (found) return found;
    }
  }
  return null;
}

export function LessonListTab({ course }: LessonListTabProps) {
  const { t } = useI18n();
  const canManage = useCanManageCourse(course.id);

  // Draft store dùng chung reconcile với tab "Nội dung" — add/sửa/xoá/đổi thứ tự bài học ngay tại đây,
  // bấm "Lưu thay đổi" đồng bộ xuống BE qua reconcileCourseTree (reuse coreClient endpoints, no new BE).
  const init = useCourseTreeDraftStore((s) => s.init);
  const tree = useCourseTreeDraftStore((s) => s.tree);
  const dirty = useCourseTreeDraftStore((s) => s.dirty);
  const updateNode = useCourseTreeDraftStore((s) => s.updateNode);
  const addNode = useCourseTreeDraftStore((s) => s.addNode);
  const removeNode = useCourseTreeDraftStore((s) => s.removeNode);
  const moveNode = useCourseTreeDraftStore((s) => s.moveNode);
  const saveApi = useSaveCourseTree(course.id);

  // Truyền course.tree NGUYÊN tham chiếu (không `?? []`) để store phân biệt "mount lại cùng dữ liệu"
  // với "server trả tree mới" — tránh xoá mất bài học đang sửa dở khi chuyển sang tab "Nội dung".
  useEffect(() => {
    init(course.tree);
  }, [course.tree, init]);

  // Trạng thái knowledge AI theo lô (1 query cho cả khoá) — cột phụ, lỗi thì để trống.
  const { data: knowledgeMap } = useCourseLessonsKnowledge(course.id);

  const [drawerLessonId, setDrawerLessonId] = useState<string | null>(null);
  const [drawerLessonTitle, setDrawerLessonTitle] = useState<string>("");
  const [newLessonSection, setNewLessonSection] = useState<CourseTreeNode | null>(null);

  const sections = tree.filter((n) => n.type === "section");

  const moveWithinSiblings = (key: string, dir: -1 | 1) => {
    const siblings = findSiblings(tree, key);
    if (!siblings) return;
    const idx = siblings.findIndex((n) => n.key === key);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    // dropPosition -1 = thả TRƯỚC target (lên), +1 = thả SAU target (xuống); cùng tầng nên moveNode hợp lệ.
    moveNode(key, siblings[targetIdx].key, dir);
  };

  const handleDropRow = (dragKey: string, dropKey: string) => {
    const siblings = findSiblings(tree, dragKey);
    if (!siblings || !siblings.some((n) => n.key === dropKey)) return; // chỉ đảo trong cùng chương
    const dragIdx = siblings.findIndex((n) => n.key === dragKey);
    const dropIdx = siblings.findIndex((n) => n.key === dropKey);
    moveNode(dragKey, dropKey, dropPositionFor(dragIdx, dropIdx));
  };

  /** Bài học mới đi qua popup → gọi BE ngay, nên draft chưa lưu sẽ bị refetch ghi đè. */
  const openNewLesson = (section: CourseTreeNode) => {
    if (!section.id) {
      message.warning('Bấm "Lưu thay đổi" để tạo chương trước khi thêm bài học');
      return;
    }
    if (dirty) {
      message.warning('Còn thay đổi chưa lưu — bấm "Lưu thay đổi" trước khi thêm bài học');
      return;
    }
    setNewLessonSection(section);
  };

  const handleDeleteSection = (section: CourseTreeNode) => {
    const lessonCount = (section.children ?? []).length;
    Modal.confirm({
      title: "Xoá chương",
      content: (
        <>
          Xoá chương <strong>{section.title}</strong>
          {lessonCount > 0 ? (
            <>
              {" "}
              sẽ xoá luôn <strong>{lessonCount}</strong> bài học bên trong.
            </>
          ) : (
            "."
          )}{" "}
          Thay đổi chỉ áp dụng sau khi bấm "Lưu thay đổi".
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => removeNode(section.key),
    });
  };

  const handleDeleteLesson = (lesson: LessonRow) => {
    Modal.confirm({
      title: "Xoá bài học",
      content: (
        <>
          Xoá bài học <strong>{lesson.title}</strong>? Thay đổi chỉ áp dụng sau khi bấm "Lưu thay đổi".
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => removeNode(lesson.key),
    });
  };

  const handleSave = () => {
    saveApi.mutate(
      { draft: tree, server: course.tree ?? [] },
      {
        onSuccess: () => message.success("Đã lưu bài học"),
        onError: (err: Error) => message.error(err.message || "Lưu thất bại"),
      }
    );
  };

  const lessonColumns: TableProps<LessonRow>["columns"] = [
    {
      title: "Bài học",
      dataIndex: "title",
      render: (_: unknown, record: LessonRow) =>
        canManage ? (
          <Space direction="vertical" size={0} style={{ width: "100%" }}>
            <Input
              value={record.title}
              onChange={(e) => updateNode(record.key, { title: e.target.value })}
              variant="borderless"
              style={{ paddingLeft: 0 }}
            />
            <Input
              value={record.description ?? ""}
              onChange={(e) => updateNode(record.key, { description: e.target.value })}
              variant="borderless"
              placeholder="Mô tả bài học"
              style={{ paddingLeft: 0, fontSize: 12, color: "rgba(0,0,0,0.45)" }}
            />
          </Space>
        ) : (
          <Space direction="vertical" size={0}>
            <span>{record.title}</span>
            {record.description && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.description}
              </Typography.Text>
            )}
          </Space>
        ),
    },
    {
      title: "Trạng thái",
      width: 220,
      render: (_: unknown, record: LessonRow) =>
        record.id ? (
          <Space wrap>
            <ContentBadge lessonId={record.id} type={record.type} emptyLabel="Chưa có nội dung" />
            <PreviewTooltip lessonId={record.id} type={record.type} />
          </Space>
        ) : (
          <Tag color="warning">Chưa lưu</Tag>
        ),
    },
    {
      title: t("lesson.knowledge.column"),
      width: 140,
      render: (_: unknown, record: LessonRow) => {
        if (!record.id) return null;
        const row = knowledgeMap?.[record.id];
        return row ? <KnowledgeStatusTag status={row.status} /> : null;
      },
    },
    {
      title: "Thao tác",
      width: 260,
      render: (_: unknown, record: LessonRow) => (
        <Space size={4} wrap>
          {record.id && (
            <Tooltip title="Xem video / nội dung">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setDrawerLessonId(record.id!);
                  setDrawerLessonTitle(record.title);
                }}
              />
            </Tooltip>
          )}
          {record.id && (
            <Link
              to={`/academic/courses/${course.id}/lessons/${record.id}`}
              state={{ lessonTitle: record.title }}
            >
              <Tooltip title={canManage ? "Soạn nội dung" : "Xem nội dung"}>
                <Button size="small" icon={<EditOutlined />} />
              </Tooltip>
            </Link>
          )}
          {canManage && (
            <>
              <Tooltip title="Lên">
                <Button
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={record.index === 0}
                  onClick={() => moveWithinSiblings(record.key, -1)}
                />
              </Tooltip>
              <Tooltip title="Xuống">
                <Button
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={record.index === record.siblingCount - 1}
                  onClick={() => moveWithinSiblings(record.key, 1)}
                />
              </Tooltip>
              <Tooltip title="Xoá">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteLesson(record)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const buildLessonRows = (section: CourseTreeNode): LessonRow[] => {
    const lessons = (section.children ?? []).filter(
      (n) => n.type === "lesson" || n.type === "assignment"
    );
    return lessons.map((lesson, i) => ({
      key: lesson.key,
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      type: inferLessonType(lesson),
      index: i,
      siblingCount: lessons.length,
    }));
  };

  return (
    <div>
      <Space
        style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}
        align="start"
        wrap
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          Danh sách bài học
        </Typography.Title>
        {canManage && (
          <Space wrap>
            {dirty && <Typography.Text type="warning">Chưa lưu</Typography.Text>}
            <Button icon={<FolderAddOutlined />} onClick={() => addNode(null, "section")}>
              Thêm chương
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saveApi.isPending}
              disabled={!dirty}
            >
              Lưu thay đổi
            </Button>
          </Space>
        )}
      </Space>

      {!canManage && (
        <Alert
          type="info"
          message="Chế độ chỉ đọc"
          description="Bạn không có quyền chỉnh sửa khoá học này."
          style={{ marginBottom: 16 }}
        />
      )}

      {sections.length === 0 ? (
        <Empty description="Chưa có chương/bài học nào" />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {sections.map((section, sIdx) => (
            <Card
              key={section.key}
              size="small"
              // Chương cũng kéo-thả được: chỉ tay cầm (icon) mới draggable — kéo cả card sẽ nuốt
              // thao tác bôi đen trong ô nhập tên/mô tả bên trong.
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dragKey = e.dataTransfer.getData("text/plain");
                if (dragKey && dragKey !== section.key) handleDropRow(dragKey, section.key);
              }}
              title={
                canManage ? (
                  <Space size={4} style={{ width: "100%" }}>
                    <Tooltip title="Kéo để đổi thứ tự chương">
                      <HolderOutlined
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", section.key)}
                        style={{ cursor: "move", color: "rgba(0,0,0,0.45)" }}
                      />
                    </Tooltip>
                    <Input
                      value={section.title}
                      onChange={(e) => updateNode(section.key, { title: e.target.value })}
                      variant="borderless"
                      style={{ paddingLeft: 0, fontWeight: 600 }}
                    />
                  </Space>
                ) : (
                  <span>{section.title}</span>
                )
              }
              extra={
                canManage && (
                  <Space size={4} wrap>
                    <Tooltip title="Chương lên">
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={sIdx === 0}
                        onClick={() => moveWithinSiblings(section.key, -1)}
                      />
                    </Tooltip>
                    <Tooltip title="Chương xuống">
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={sIdx === sections.length - 1}
                        onClick={() => moveWithinSiblings(section.key, 1)}
                      />
                    </Tooltip>
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => openNewLesson(section)}
                    >
                      Thêm bài học
                    </Button>
                    <Tooltip title="Xoá chương">
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteSection(section)}
                      />
                    </Tooltip>
                  </Space>
                )
              }
            >
              <Table
                rowKey="key"
                size="small"
                dataSource={buildLessonRows(section)}
                columns={lessonColumns}
                pagination={false}
                locale={{ emptyText: "Chương chưa có bài học" }}
                components={
                  canManage
                    ? {
                        body: {
                          row: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
                            <DraggableRow {...props} onDropRow={handleDropRow} />
                          ),
                        },
                      }
                    : undefined
                }
              />
            </Card>
          ))}
        </Space>
      )}

      <LessonContentDrawer
        lessonId={drawerLessonId}
        lessonTitle={drawerLessonTitle}
        open={drawerLessonId !== null}
        onClose={() => setDrawerLessonId(null)}
      />

      {newLessonSection?.id && (
        <NewLessonModal
          open
          courseId={course.id}
          sectionId={newLessonSection.id}
          sectionTitle={newLessonSection.title}
          sortOrder={(newLessonSection.children ?? []).length}
          onClose={() => setNewLessonSection(null)}
        />
      )}
    </div>
  );
}
