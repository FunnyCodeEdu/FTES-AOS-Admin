import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  List,
  Modal,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { FolderOpenOutlined, PlusOutlined } from "@ant-design/icons";
import type { Course } from "../../types";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useUpdateLessonMeta } from "../api/lessons.api";
import {
  useCourseUnattachedChallenges,
  useDeleteChallenge,
  useLessonChallenges,
  useLessonQuizzes,
  useLinkChallengeLesson,
  usePublishChallenge,
  useSetChallengeVisibility,
  useUpdateChallenge,
} from "../../exercises/api/exercises.api";
import type { ChallengeView } from "../../exercises/types";
import {
  ChallengeWizardDrawer,
  isLessonLinkConflict,
} from "../../exercises/components/ChallengeWizardDrawer";
import { ChallengeEditModal } from "../../exercises/components/ChallengeEditModal";
import { AttachFromBankModal } from "../../exercises/components/AttachFromBankModal";
import { DeleteConfirmModal } from "../../../../shared/components/DeleteConfirmModal";
import { assessPublishRisk } from "../../exercises/publishRisk";

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
  /**
   * Cờ `free` HIỆN TẠI của BÀI HỌC (admin-lesson-challenge-free-toggle) — nguồn cho toggle "Miễn phí
   * (học thử)" ở đầu card. lesson.free=true → cả buổi mở cho học viên đăng nhập chưa enroll (FULL
   * access) và các thử thách `free` của buổi mới thực sự mở. Thread từ LessonListTab (cây khoá) /
   * LessonEditPage (adminLessonContent). Đổi cờ gọi useUpdateLessonMeta (PATCH /courses/lessons/{id}).
   */
  lessonFree?: boolean;
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
  lessonFree,
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
  const deleteChallenge = useDeleteChallenge();
  // admin-lesson-challenge-free-toggle: bật/tắt cờ `free` per-challenge (học thử) NGAY trên hàng.
  const updateChallenge = useUpdateChallenge();
  // Cờ `free` toàn BÀI (PATCH /courses/lessons/{id}) — gate theo canManage (sửa meta bài học).
  const updateLessonMeta = useUpdateLessonMeta(lessonId, courseId);

  const [wizardOpen, setWizardOpen] = useState(false);
  // Nhặt bài ĐÃ CÓ từ kho chung (khác wizard = soạn mới). Hai việc khác nhau nên hai nút.
  const [bankOpen, setBankOpen] = useState(false);
  const [editing, setEditing] = useState<ChallengeView | null>(null);
  const [deleting, setDeleting] = useState<ChallengeView | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  // Hàng challenge đang lưu cờ học thử (spinner riêng cho Switch — tách khỏi mutatingId của link/visibility).
  const [freeChallengeId, setFreeChallengeId] = useState<string | null>(null);
  // Trạng thái Switch "Miễn phí" cả buổi — seed từ prop, giữ local để phản hồi tức thì + revert khi lỗi.
  const [lessonFreeOn, setLessonFreeOn] = useState<boolean>(!!lessonFree);
  useEffect(() => setLessonFreeOn(!!lessonFree), [lessonFree]);

  const toggleChallengeFree = (row: ChallengeView, next: boolean) => {
    setFreeChallengeId(row.id);
    updateChallenge.mutate(
      { id: row.id, body: { free: next } },
      {
        onSuccess: () => {
          message.success(
            next ? `Đã bật học thử "${row.title}"` : `Đã tắt học thử "${row.title}"`
          );
          // useUpdateChallenge tự invalidate danh sách challenge → hàng refetch cờ free mới.
        },
        onSettled: () => setFreeChallengeId(null),
      }
    );
  };

  const toggleLessonFree = (next: boolean) => {
    setLessonFreeOn(next); // optimistic — đổi nhìn thấy ngay
    updateLessonMeta.mutate(
      { free: next },
      {
        onSuccess: () =>
          message.success(next ? "Đã mở miễn phí cả buổi (học thử)" : "Đã tắt miễn phí cả buổi"),
        onError: (err) => {
          setLessonFreeOn(!next); // revert khi BE từ chối
          handleAdminMutationError(err);
        },
      }
    );
  };

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

  // "Xoá" per-challenge (hard delete, cần lý do audit) — qua DeleteConfirmModal.
  const renderDeleteAction = (row: ChallengeView) =>
    canChallenge ? (
      <Button key="delete" size="small" danger onClick={() => setDeleting(row)}>
        Xoá
      </Button>
    ) : null;

  // admin-lesson-challenge-free-toggle: Switch "Học thử" NGAY trên hàng challenge của bài (nguồn
  // challenges.data có `free` THẬT). Chỉ gắn cho hàng đã gắn bài — KHÔNG cho danh sách "chưa gắn"
  // (thiếu free/description tin cậy, như renderEditAction). `checked` bind thẳng vào c.free (query
  // data) nên tự refetch/tự revert khi lỗi; spinner theo freeChallengeId.
  const renderFreeToggle = (row: ChallengeView) =>
    canChallenge ? (
      <Tooltip
        key="free"
        title="Bật = cho làm miễn phí/học thử — chỉ mở khi BUỔI cũng free/đã mở"
      >
        <Space size={4}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Học thử
          </Typography.Text>
          <Switch
            size="small"
            checked={row.free ?? false}
            loading={freeChallengeId === row.id}
            onChange={(next) => toggleChallengeFree(row, next)}
          />
        </Space>
      </Tooltip>
    ) : null;

  return (
    <Card title="Thực hành (Thử thách · Bài tập · Quiz)">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* --- Miễn phí (học thử toàn bài) — admin-lesson-challenge-free-toggle --- */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "8px 12px",
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            borderRadius: 8,
          }}
        >
          <Space size={8} wrap>
            <Typography.Text strong>Miễn phí (học thử)</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              cả buổi mở cho học viên đăng nhập (không cần enroll) → các bài tập "học thử" của buổi cũng mở
            </Typography.Text>
          </Space>
          <Tooltip title="Bật = cả buổi mở cho học viên đăng nhập (không cần enroll) → các bài tập 'học thử' của buổi cũng mở.">
            <Switch
              checked={lessonFreeOn}
              disabled={!canManage}
              loading={updateLessonMeta.isPending}
              onChange={toggleLessonFree}
              checkedChildren="Mở"
              unCheckedChildren="Khoá"
            />
          </Tooltip>
        </div>

        {/* --- Thử thách (challenge) --- */}
        <div>
          <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text strong>Thử thách (Challenge)</Typography.Text>
            {canChallenge && (
              <Space size={8}>
                {/* Nhặt bài đã có trong kho chung — đường DÙNG LẠI bài của môn/khoá khác.
                    Thiếu nút này thì đứng từ bài học chỉ soạn mới được, và bài của môn A vô
                    hình khi đang ở môn B. */}
                <Button size="small" icon={<FolderOpenOutlined />} onClick={() => setBankOpen(true)}>
                  Thêm từ kho
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setWizardOpen(true)}
                >
                  Thêm thử thách
                </Button>
              </Space>
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
                  actions={[
                    renderFreeToggle(c),
                    renderEditAction(c),
                    renderVisibilityAction(c),
                    renderDeleteAction(c),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    title={c.title}
                    description={
                      <Space size={4} wrap>
                        <Tag color={TYPE_COLOR[c.type] ?? "default"}>{c.type}</Tag>
                        {statusTag(c.status)}
                        {/* Người quản dùng Switch "Học thử" (actions) làm nguồn trạng thái; chỉ giữ
                            tag "Miễn phí" cho người CHỈ ĐỌC để vẫn thấy cờ. */}
                        {!canChallenge && c.free && <Tag color="green">Miễn phí</Tag>}
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
                      renderDeleteAction(c),
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

        {/* admin-challenge-unified-form §④: mục "Bài tập (Assignment)" riêng đã GỠ — bài NỘP giờ soạn
            qua "Thêm thử thách" (Challenge dạng CODE, kiểu bài nộp) ở trên. */}

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

      {bankOpen && (
        <AttachFromBankModal
          open={bankOpen}
          lessonId={lessonId}
          lessonName={lessonName}
          onClose={() => setBankOpen(false)}
          onAttached={() => {
            challenges.refetch();
            // Bài vừa nhặt có thể chính là một bài "chưa gắn" của khoá — danh sách mồ côi phải
            // bớt nó đi, nếu không nó nằm ở cả hai chỗ cùng lúc.
            orphans.refetch();
          }}
        />
      )}

      <ChallengeEditModal
        open={Boolean(editing)}
        challenge={editing}
        disabled={!canChallenge}
        onClose={() => setEditing(null)}
        onSaved={() => challenges.refetch()}
      />

      <DeleteConfirmModal
        open={Boolean(deleting)}
        title="Xoá thử thách"
        description={
          <>
            Xoá <strong>{deleting?.title}</strong> là vĩnh viễn. Nếu chỉ muốn ẩn: dùng Gỡ khỏi bài /
            Unpublish.
          </>
        }
        loading={deleteChallenge.isPending}
        onConfirm={(reason) => {
          if (!deleting) return;
          deleteChallenge.mutate(
            { id: deleting.id, reason },
            {
              onSuccess: () => {
                message.success("Đã xoá thử thách");
                setDeleting(null);
                challenges.refetch();
                orphans.refetch();
              },
            }
          );
        }}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  );
}
