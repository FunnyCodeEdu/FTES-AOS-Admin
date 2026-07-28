import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  List,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Course } from "../../types";
import {
  useCourseUnattachedChallenges,
  useLessonChallenges,
  useLessonQuizzes,
  useLinkChallengeLesson,
  usePublishChallenge,
  useSetChallengeVisibility,
} from "../../exercises/api/exercises.api";
import type { ChallengeView } from "../../exercises/types";
import {
  ChallengeWizardDrawer,
  isLessonLinkConflict,
} from "../../exercises/components/ChallengeWizardDrawer";
import { ChallengeEditModal } from "../../exercises/components/ChallengeEditModal";
import { assessPublishRisk } from "../../exercises/publishRisk";
import { LessonAssignmentEditor } from "./LessonAssignmentEditor";

interface LessonExercisesCardProps {
  lessonId: string;
  courseId?: string;
  lessonName?: string;
  /** Giá/loại khoá cho cảnh báo lộ nội dung khi public challenge (nếu có). */
  course?: Pick<Course, "basePrice" | "saleMode">;
  /** Quản được bài học (course.manage / ownership) — gate assignment + quiz. */
  canManage?: boolean;
  /**
   * Quản được THỬ THÁCH — gate riêng cho tạo/visibility challenge. Moderator chỉ có
   * `challenge.manage` (không có course.manage) vẫn public/thu-về được như tab "Kho thử thách" cũ.
   * Mặc định theo canManage khi không truyền (giữ hành vi cũ ở các chỗ gọi chưa cập nhật).
   */
  canManageChallenge?: boolean;
}

const TYPE_COLOR: Record<string, string> = {
  MULTIPLE_CHOICE: "geekblue",
  CODE: "purple",
  CODING: "purple",
  ESSAY: "magenta",
};

function statusTag(status: string) {
  switch (status) {
    case "PUBLISHED":
      return <Tag color="green">PUBLISHED</Tag>;
    case "RUNNING":
      return <Tag color="blue">RUNNING</Tag>;
    case "CLOSED":
    case "ARCHIVED":
      return <Tag color="red">{status}</Tag>;
    default:
      return <Tag>{status || "DRAFT"}</Tag>;
  }
}

/** Challenge đang hoạt động (chiếm chỗ lesson) — để cảnh báo khi tạo challenge mới cùng bài. */
function activeChallenge(list: ChallengeView[] | undefined): ChallengeView | null {
  return list?.find((c) => c.status === "PUBLISHED" || c.status === "RUNNING") ?? null;
}

/**
 * Soạn thực hành THEO BÀI (course-per-lesson-exercises): liệt kê thử thách (challenge) + bài tập
 * (assignment) + quiz của bài. Thêm challenge mở ChallengeWizardDrawer ở CHẾ ĐỘ BÀI CỐ ĐỊNH
 * (truyền lessonId). Toggle visibility Public<->Workplace (relocate từ tab "Kho thử thách" đã gỡ).
 */
export function LessonExercisesCard({
  lessonId,
  courseId,
  lessonName,
  course,
  canManage,
  canManageChallenge,
}: LessonExercisesCardProps) {
  // Gate hành động challenge tách khỏi gate sửa bài học: mặc định theo canManage nếu không truyền.
  const canChallenge = canManageChallenge ?? canManage;
  const challenges = useLessonChallenges(lessonId);
  const quizzes = useLessonQuizzes(lessonId);
  const setVisibility = useSetChallengeVisibility();
  // Lưới an toàn (finding "challenge mồ côi"): challenge của khoá chưa gắn bài — chỉ tải khi quản
  // được challenge và biết courseId, nếu không thì bỏ qua để không gọi /admin/challenges thừa.
  const orphans = useCourseUnattachedChallenges(courseId, Boolean(canChallenge && courseId));
  const linkChallenge = useLinkChallengeLesson();
  const publishChallenge = usePublishChallenge();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<ChallengeView | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const linkOrphan = async (row: ChallengeView) => {
    setMutatingId(row.id);
    try {
      await linkChallenge.mutateAsync({ id: row.id, lessonId });
      message.success(`Đã gắn "${row.title}" vào bài học này`);
      challenges.refetch();
    } catch (err) {
      if (isLessonLinkConflict(err)) {
        const occ = activeChallenge(challenges.data);
        message.error(
          occ
            ? `Bài học đã có thử thách active "${occ.title}" (${occ.status}). Hãy lưu trữ nó trước rồi gắn lại.`
            : "Bài học đã có một thử thách active khác. Hãy lưu trữ nó trước khi gắn thử thách mới."
        );
      } else {
        message.error((err as Error)?.message || "Gắn thử thách thất bại");
      }
    } finally {
      setMutatingId(null);
    }
  };

  const publishOrphan = async (row: ChallengeView) => {
    setMutatingId(row.id);
    try {
      await publishChallenge.mutateAsync({ id: row.id });
      message.success(`Đã publish "${row.title}"`);
    } catch (err) {
      message.error((err as Error)?.message || "Publish thất bại");
    } finally {
      setMutatingId(null);
    }
  };

  const runVisibility = async (id: string, visibility: "COURSE_ONLY" | "WORKSPACE_PUBLIC") => {
    setMutatingId(id);
    try {
      await setVisibility.mutateAsync({ id, visibility });
    } finally {
      setMutatingId(null);
    }
  };

  const confirmPublish = (row: ChallengeView) => {
    const risk = assessPublishRisk({ lessonId: row.lessonId }, course ?? {}, lessonName);
    Modal.confirm({
      title: risk.title,
      content: risk.content,
      okText: "Public",
      okButtonProps: risk.danger ? { danger: true } : undefined,
      cancelText: "Huỷ",
      onOk: () => runVisibility(row.id, "WORKSPACE_PUBLIC"),
    });
  };

  const confirmPullBack = (row: ChallengeView) => {
    Modal.confirm({
      title: "Thu thử thách về kho?",
      content:
        "Thử thách sẽ biến mất khỏi Workplace; học viên đã enroll vẫn truy cập qua bài học đã gắn. Thu về?",
      okText: "Thu về kho",
      cancelText: "Huỷ",
      onOk: () => runVisibility(row.id, "COURSE_ONLY"),
    });
  };

  const renderVisibilityAction = (row: ChallengeView) => {
    if (!canChallenge) {
      return row.visibility === "WORKSPACE_PUBLIC" ? (
        <Tag color="gold">Public Workplace</Tag>
      ) : (
        <Tag>Trong kho</Tag>
      );
    }
    if (row.visibility === "WORKSPACE_PUBLIC") {
      return (
        <Button size="small" loading={mutatingId === row.id} onClick={() => confirmPullBack(row)}>
          Thu về kho
        </Button>
      );
    }
    // COURSE_ONLY / chưa xác định: chỉ public được khi đang hoạt động (PUBLISHED/RUNNING).
    const active = row.status === "PUBLISHED" || row.status === "RUNNING";
    const btn = (
      <Button
        type="primary"
        size="small"
        disabled={!active}
        loading={mutatingId === row.id}
        onClick={() => confirmPublish(row)}
      >
        Public lên Workplace
      </Button>
    );
    return active ? (
      btn
    ) : (
      <Tooltip title="Chỉ thử thách đang hoạt động (PUBLISHED/RUNNING) mới public được">{btn}</Tooltip>
    );
  };

  // "Sửa" per-lesson challenge (admin-challenge-edit): mở modal sửa nhanh title/mô tả/cờ học thử.
  // Chỉ gắn cho hàng challenge của bài (nguồn GET /challenges có free/description THẬT để pre-fill);
  // KHÔNG gắn cho danh sách "chưa gắn" (BankChallengeView thiếu free/description → pre-fill không chắc).
  const renderEditAction = (row: ChallengeView) =>
    canChallenge ? (
      <Button key="edit" size="small" onClick={() => setEditing(row)}>
        Sửa
      </Button>
    ) : null;

  return (
    <Card title="Thực hành (Thử thách · Bài tập · Quiz)">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* --- Thử thách (challenge) --- */}
        <div>
          <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text strong>Thử thách (Challenge)</Typography.Text>
            {canChallenge && (
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setWizardOpen(true)}
              >
                Thêm thử thách
              </Button>
            )}
          </Space>
          {challenges.isError && (
            <Alert type="error" message={challenges.error?.message} style={{ marginBottom: 8 }} />
          )}
          {(challenges.data?.length ?? 0) === 0 && !challenges.isLoading ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bài học chưa có thử thách" />
          ) : (
            <List
              size="small"
              loading={challenges.isLoading}
              dataSource={challenges.data ?? []}
              renderItem={(c) => (
                <List.Item
                  actions={[renderEditAction(c), renderVisibilityAction(c)].filter(Boolean)}
                >
                  <List.Item.Meta
                    title={c.title}
                    description={
                      <Space size={4} wrap>
                        <Tag color={TYPE_COLOR[c.type] ?? "default"}>{c.type}</Tag>
                        {statusTag(c.status)}
                        {c.free && <Tag color="green">Miễn phí</Tag>}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>

        {/* --- Thử thách CHƯA GẮN của khoá (kho) — lưới an toàn cho challenge mồ côi --- */}
        {canChallenge && (orphans.data?.length ?? 0) > 0 && (
          <div>
            <Typography.Text strong>Thử thách chưa gắn (kho khoá học)</Typography.Text>
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 8, marginBottom: 8 }}
              message="Các thử thách đã tạo nhưng chưa gắn vào bài học nào (kể cả bản nháp). Gắn vào bài này, publish, hoặc chỉnh hiển thị để tránh bị bỏ quên."
            />
            <List
              size="small"
              dataSource={orphans.data ?? []}
              renderItem={(c) => {
                const active = c.status === "PUBLISHED" || c.status === "RUNNING";
                return (
                  <List.Item
                    actions={[
                      <Button
                        key="link"
                        size="small"
                        type="primary"
                        loading={mutatingId === c.id}
                        onClick={() => linkOrphan(c)}
                      >
                        Gắn vào bài này
                      </Button>,
                      ...(!active
                        ? [
                            <Button
                              key="publish"
                              size="small"
                              loading={mutatingId === c.id}
                              onClick={() => publishOrphan(c)}
                            >
                              Publish
                            </Button>,
                          ]
                        : []),
                      renderVisibilityAction(c),
                    ]}
                  >
                    <List.Item.Meta
                      title={c.title}
                      description={
                        <Space size={4} wrap>
                          <Tag color={TYPE_COLOR[c.type] ?? "default"}>{c.type}</Tag>
                          {statusTag(c.status)}
                          {c.free && <Tag color="green">Miễn phí</Tag>}
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        )}

        <Divider style={{ margin: 0 }} />

        {/* --- Bài tập (assignment) --- */}
        <LessonAssignmentEditor lessonId={lessonId} disabled={!canManage} />

        <Divider style={{ margin: 0 }} />

        {/* --- Quiz (chỉ liệt kê; soạn quiz chi tiết ngoài phạm vi card này) --- */}
        <div>
          <Typography.Text strong>Quiz</Typography.Text>
          {quizzes.isError && (
            <Alert type="error" message={quizzes.error?.message} style={{ marginTop: 8 }} />
          )}
          {(quizzes.data?.length ?? 0) === 0 && !quizzes.isLoading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Bài học chưa có quiz"
              style={{ marginTop: 8 }}
            />
          ) : (
            <List
              size="small"
              loading={quizzes.isLoading}
              dataSource={quizzes.data ?? []}
              renderItem={(q) => (
                <List.Item>
                  <List.Item.Meta
                    title={q.title}
                    description={
                      <Space size={4} wrap>
                        <Tag>{q.questionCount} câu</Tag>
                        <Tag>Đạt: {q.passScorePercent}%</Tag>
                        {statusTag(q.status)}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Space>

      {wizardOpen && (
        <ChallengeWizardDrawer
          open={wizardOpen}
          lessonId={lessonId}
          courseId={courseId}
          disabled={!canChallenge}
          occupyingChallenge={activeChallenge(challenges.data)}
          onClose={() => setWizardOpen(false)}
          onMutated={() => challenges.refetch()}
        />
      )}

      <ChallengeEditModal
        open={Boolean(editing)}
        challenge={editing}
        disabled={!canChallenge}
        onClose={() => setEditing(null)}
        onSaved={() => challenges.refetch()}
      />
    </Card>
  );
}
