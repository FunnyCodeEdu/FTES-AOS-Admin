import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { TableProps } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FolderAddOutlined,
  HolderOutlined,
  MinusOutlined,
  PlusOutlined,
  SaveOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
import { useCanManageCourse } from "../hooks/useCanManageCourse";
import { useLessonContent, useLessonPreview, useUpdateLessonPreview } from "../api/lessons.api";
import { useCourseLessonsKnowledge } from "../api/lessonKnowledge.api";
import { KnowledgeStatusTag } from "./LessonKnowledgeBadge";
import { useSaveCourseTree } from "../../courses/api/courses.api";
import { useCourseTreeDraftStore } from "../../courses/store/courseTreeDraftStore";
import { LessonContentDrawer } from "../../courses/components/LessonContentDrawer";
import { NewLessonModal } from "./NewLessonModal";
import { LessonDocumentsPanel } from "./LessonDocumentsPanel";
import { LessonExercisesCard } from "./LessonExercisesCard";
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
  /** Key của chương chứa bài — cho dropdown "Chuyển chương" loại trừ chương hiện tại. */
  sectionKey: string;
  /** Chỉ node cây type "lesson" mới di chuyển được (moveNode chặn "assignment" legacy) — dùng để
   * tắt nút Lên/Xuống/Chuyển chương thay vì để bấm rồi im lặng không xảy ra gì. */
  movable: boolean;
  /** Cờ "Miễn phí (học thử toàn bài)" của bài — nguồn cho toggle ở panel thử thách (LessonExercisesCard). */
  free?: boolean;
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

/**
 * Nhãn học thử — video-preview-admin-gate: CẢ VIDEO lẫn DOCUMENT nay theo % (preview_percent).
 * 0 = tắt tường minh; null = kế thừa mặc định khoá. Với VIDEO, thêm cửa sổ mm:ss (= % × thời lượng).
 */
function PreviewTooltip({ lessonId, type }: { lessonId: string; type: LessonType }) {
  const { data: preview } = useLessonPreview(lessonId, type);
  if (!preview) return null;
  const renderTag = (label: string, tip?: string) => (
    <Tooltip title={tip ?? label}>
      <Tag>{label}</Tag>
    </Tooltip>
  );
  if (type === "VIDEO" || type === "DOCUMENT") {
    if (preview.previewPercent === 0) return renderTag("Không học thử", "Bài này tắt học thử");
    const pct = preview.effectivePreviewPercent ?? 0;
    if (pct <= 0) return null; // khoá chưa đặt % mặc định → không có gì để hiển thị
    const inherited = preview.previewPercent == null;
    const suffix = type === "VIDEO" ? ` (≈ ${formatMmss(preview.effectivePreviewSeconds)})` : "";
    return renderTag(`Học thử ${pct}%${suffix} · ${inherited ? "kế thừa" : "ghi đè"}`);
  }
  return null;
}

/**
 * Chỉnh học thử NGAY trên hàng bài học (thay tag chỉ-đọc cũ). video-preview-admin-gate: CẢ VIDEO lẫn
 * DOCUMENT nay học thử theo % (preview_percent) — video gate + cửa sổ đều tính từ %. Ba trạng thái BE
 * phân biệt rõ:
 *  - override (own > 0): Switch BẬT + % riêng của bài.
 *  - kế thừa (own == null): Switch TẮT nhưng bài VẪN cho học thử theo mặc định khoá → hiện tag
 *    "kế thừa · <effective>" + nút "Tắt hẳn" để ghi 0 tường minh (không phải bật rồi tắt).
 *  - tắt tường minh (own === 0): Switch TẮT, không tag.
 * BẬT = ghi % > 0 (override); "Tắt hẳn"/tắt switch = ghi 0. KHÔNG động cờ `free` (free =
 * miễn phí FULL). Lưu khi blur/Enter (Switch lưu ngay). Reuse semantics của LessonTrialConfig.
 * VIDEO chỉ đặt được % khi đã READY (BE 400 nếu chưa) → chặn khi video đang xử lý.
 */
function InlineTrialEditor({
  lessonId,
  courseId,
  type,
}: {
  lessonId: string;
  courseId?: string;
  type: LessonType;
}) {
  const { data: preview } = useLessonPreview(lessonId, type);
  const updatePreview = useUpdateLessonPreview(lessonId, courseId);
  const isVideo = type === "VIDEO";
  const [enabled, setEnabled] = useState(false);
  const [value, setValue] = useState<number | null>(null);

  // own: null/undefined = kế thừa mặc định khoá; 0 = tắt tường minh; > 0 = ghi đè bật.
  const own = preview?.previewPercent;
  const inheriting = preview != null && own == null;
  const effective = preview?.effectivePreviewPercent ?? 0;
  // Kế thừa VÀ khoá thực sự cho học thử (effective > 0) → bài đang lộ nội dung dù switch tắt.
  const inheritsActive = inheriting && effective > 0;
  // Video chỉ đặt được % khi đã READY (BE 400 nếu chưa).
  const videoNotReady = isVideo && !!preview?.videoStatus && preview.videoStatus !== "ready";

  useEffect(() => {
    if (!preview) return;
    const raw = preview.previewPercent;
    const on = typeof raw === "number" && raw > 0;
    setEnabled(on);
    setValue(on ? raw : null);
  }, [preview]);

  const persist = (v: number) => {
    updatePreview.mutate({ previewPercent: v }, {
      onSuccess: () => message.success("Đã lưu học thử"),
      onError: (err: Error) => message.error(err.message || "Lưu học thử thất bại"),
    });
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (checked) {
      const def = value && value > 0 ? value : 10;
      setValue(def);
      persist(def);
    } else {
      setValue(null);
      persist(0); // 0 = tắt tường minh (không kế thừa mặc định khoá)
    }
  };

  const turnOffExplicitly = () => {
    setEnabled(false);
    setValue(null);
    persist(0); // ghi 0 thẳng từ trạng thái kế thừa (không cần bật rồi tắt)
  };

  const commit = () => {
    if (!enabled) return;
    if (!value || value <= 0 || value > 100) {
      message.error("Nhập % trong khoảng 1–100");
      return;
    }
    persist(value);
  };

  const effectiveLabel = isVideo
    ? `${effective}% (≈ ${formatMmss(preview?.effectivePreviewSeconds ?? 0)})`
    : `${effective}%`;

  return (
    <Space size={6} wrap>
      <Tooltip title="Bật = học thử riêng bài này; Tắt = ghi 0 (không cho học thử bài này). Khi chưa đặt riêng, bài kế thừa mặc định khoá.">
        <Switch
          size="small"
          checked={enabled}
          disabled={videoNotReady}
          loading={updatePreview.isPending}
          onChange={handleToggle}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      </Tooltip>
      <InputNumber
        size="small"
        value={value ?? undefined}
        disabled={!enabled || videoNotReady}
        min={1}
        max={100}
        onChange={(v) => setValue(typeof v === "number" ? v : null)}
        onBlur={commit}
        onPressEnter={commit}
        addonAfter="%"
        style={{ width: 120 }}
      />
      {videoNotReady && <Tag color="warning">video đang xử lý</Tag>}
      {inheritsActive && (
        <>
          <Tooltip title="Bài này CHƯA đặt học thử riêng nên KẾ THỪA mặc định khoá — học viên VẪN xem thử được. Bấm 'Tắt hẳn' để chặn riêng bài này.">
            <Tag color="blue">kế thừa · {effectiveLabel}</Tag>
          </Tooltip>
          <Button
            size="small"
            danger
            loading={updatePreview.isPending}
            onClick={turnOffExplicitly}
          >
            Tắt hẳn
          </Button>
        </>
      )}
      {inheriting && !inheritsActive && <Tag>kế thừa · tắt</Tag>}
    </Space>
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

/** Tìm node theo key ở bất kỳ tầng nào (cho biết type để chặn move không hợp lệ). */
function findNode(tree: CourseTreeNode[], key: string): CourseTreeNode | null {
  for (const n of tree) {
    if (n.key === key) return n;
    if (n.children) {
      const found = findNode(n.children, key);
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
  // Bài đang mở panel tài liệu/thử thách (nút "+" mỗi bài). Key bài toàn cục duy nhất nên 1 mảng
  // dùng chung cho mọi bảng-theo-chương; mỗi bảng chỉ expand đúng hàng của nó.
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  /** Mở drawer "Xem nội dung" (play/render theo loại) cho một bài đã lưu (có id). */
  const openContentDrawer = (record: LessonRow) => {
    if (!record.id) return;
    setDrawerLessonId(record.id);
    setDrawerLessonTitle(record.title);
  };

  const sections = tree.filter((n) => n.type === "section");

  // Kéo-thả (hàng bài học + tay cầm chương) là cách đổi thứ tự duy nhất — đã bỏ nút Lên/Xuống.
  const handleDropRow = (dragKey: string, dropKey: string) => {
    const siblings = findSiblings(tree, dragKey);
    if (!siblings || !siblings.some((n) => n.key === dropKey)) return; // chỉ đảo trong cùng chương
    const dragIdx = siblings.findIndex((n) => n.key === dragKey);
    const dropIdx = siblings.findIndex((n) => n.key === dropKey);
    moveNode(dragKey, dropKey, dropPositionFor(dragIdx, dropIdx));
  };

  /**
   * Thả lên CARD một chương. Kéo CHƯƠNG → đảo thứ tự chương (handleDropRow). Kéo BÀI HỌC sang chương
   * KHÁC → reparent về CUỐI chương đích: moveNode(dragKey, sectionKey, 0) push vào cuối children
   * (store + reconcileCourseTree tự đổi cha khi lưu). Bài cùng chương thì để row-drop lo việc đảo
   * thứ tự (bỏ qua ở đây). Node "assignment" legacy KHÔNG di chuyển được (moveNode chặn) → báo rõ
   * thay vì im lặng.
   */
  const handleDropOnSection = (dragKey: string, section: CourseTreeNode) => {
    if (!dragKey || dragKey === section.key) return;
    if (sections.some((s) => s.key === dragKey)) {
      handleDropRow(dragKey, section.key);
      return;
    }
    if ((section.children ?? []).some((c) => c.key === dragKey)) return; // cùng chương
    const node = findNode(tree, dragKey);
    if (node && node.type !== "lesson") {
      message.warning("Chỉ chuyển được bài học (không chuyển được mục bài tập cũ).");
      return;
    }
    moveNode(dragKey, section.key, 0);
  };

  /** Chuyển bài học sang chương khác (a11y, không cần kéo-thả) — reparent về CUỐI chương đích. */
  const moveLessonToSection = (lessonKey: string, sectionKey: string) => {
    moveNode(lessonKey, sectionKey, 0);
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
            {record.id && (
              <ContentBadge lessonId={record.id} type={record.type} emptyLabel="Chưa có nội dung" />
            )}
          </Space>
        ) : (
          <Space direction="vertical" size={0}>
            {/* B2: bấm tiêu đề bài học = mở drawer xem nội dung (play/render theo loại). */}
            {record.id ? (
              <Typography.Link onClick={() => openContentDrawer(record)}>
                {record.title}
              </Typography.Link>
            ) : (
              <span>{record.title}</span>
            )}
            {record.description && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.description}
              </Typography.Text>
            )}
            {record.id && (
              <ContentBadge lessonId={record.id} type={record.type} emptyLabel="Chưa có nội dung" />
            )}
          </Space>
        ),
    },
    {
      title: "Thời gian học thử",
      width: 240,
      render: (_: unknown, record: LessonRow) => {
        if (!record.id) return <Tag color="warning">Chưa lưu</Tag>;
        // Chỉ VIDEO/DOCUMENT có cơ chế học thử — sửa inline khi quản được; còn lại đọc (tag).
        if (canManage && (record.type === "VIDEO" || record.type === "DOCUMENT")) {
          return <InlineTrialEditor lessonId={record.id} courseId={course.id} type={record.type} />;
        }
        return <PreviewTooltip lessonId={record.id} type={record.type} />;
      },
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
              <Button size="small" icon={<EyeOutlined />} onClick={() => openContentDrawer(record)} />
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
              {sections.length > 1 && record.movable && (
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: sections
                      .filter((s) => s.key !== record.sectionKey)
                      .map((s) => ({ key: s.key, label: s.title || "(chương chưa đặt tên)" })),
                    onClick: ({ key }) => moveLessonToSection(record.key, key),
                  }}
                >
                  <Tooltip title="Chuyển sang chương khác">
                    <Button size="small" icon={<SwapOutlined />} />
                  </Tooltip>
                </Dropdown>
              )}
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
      sectionKey: section.key,
      movable: lesson.type === "lesson",
      free: lesson.free,
    }));
  };

  /**
   * Panel quản lý NGAY dưới bài học (mở bằng nút "+"): tài liệu (LessonDocumentsPanel) + thực hành /
   * thử thách (LessonExercisesCard). Tái dùng nguyên 2 panel của màn soạn bài — upload tài liệu,
   * thêm/gắn challenge, và HIỂN THỊ danh sách tài liệu + thử thách hiện có. Chỉ bài đã lưu (có id).
   */
  const renderLessonExpansion = (record: LessonRow) => {
    if (!record.id) return null;
    return (
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <LessonDocumentsPanel lessonId={record.id} disabled={!canManage} />
        <LessonExercisesCard
          lessonId={record.id}
          courseId={course.id}
          lessonName={record.title}
          canManage={canManage}
          lessonFree={record.free}
        />
      </Space>
    );
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
          {sections.map((section) => (
            <Card
              key={section.key}
              size="small"
              // Chương cũng kéo-thả được: chỉ tay cầm (icon) mới draggable — kéo cả card sẽ nuốt
              // thao tác bôi đen trong ô nhập tên/mô tả bên trong.
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dragKey = e.dataTransfer.getData("text/plain");
                handleDropOnSection(dragKey, section);
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
                expandable={{
                  expandedRowKeys: expandedKeys,
                  onExpand: (expanded, record) =>
                    setExpandedKeys((keys) =>
                      expanded ? [...keys, record.key] : keys.filter((k) => k !== record.key)
                    ),
                  rowExpandable: (record) => !!record.id,
                  expandedRowRender: renderLessonExpansion,
                  // Nút "+" mỗi bài (mở/đóng panel tài liệu + thử thách). Bài chưa lưu: chừa chỗ trống.
                  expandIcon: ({ expanded, onExpand, record }) =>
                    record.id ? (
                      <Tooltip title={expanded ? "Ẩn tài liệu / thử thách" : "Tài liệu / thử thách"}>
                        <Button
                          size="small"
                          type={expanded ? "primary" : "dashed"}
                          icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
                          onClick={(e) => onExpand(record, e)}
                        />
                      </Tooltip>
                    ) : (
                      <span style={{ display: "inline-block", width: 24 }} />
                    ),
                }}
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
