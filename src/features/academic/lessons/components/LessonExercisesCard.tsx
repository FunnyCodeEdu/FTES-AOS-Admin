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
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Course } from "../../types";
import {
  useLessonChallenges,
  useLessonQuizzes,
  useSetChallengeVisibility,
} from "../../exercises/api/exercises.api";
import type { ChallengeView } from "../../exercises/types";
import { ChallengeWizardDrawer } from "../../exercises/components/ChallengeWizardDrawer";
import { assessPublishRisk } from "../../exercises/publishRisk";
import { LessonAssignmentEditor } from "./LessonAssignmentEditor";

interface LessonExercisesCardProps {
  lessonId: string;
  courseId?: string;
  lessonName?: string;
  /** Giá/loại khoá cho cảnh báo lộ nội dung khi public challenge (nếu có). */
  course?: Pick<Course, "basePrice" | "saleMode">;
  canManage?: boolean;
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
}: LessonExercisesCardProps) {
  const challenges = useLessonChallenges(lessonId);
  const quizzes = useLessonQuizzes(lessonId);
  const setVisibility = useSetChallengeVisibility();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

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
    if (!canManage) {
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

  return (
    <Card title="Thực hành (Thử thách · Bài tập · Quiz)">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* --- Thử thách (challenge) --- */}
        <div>
          <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text strong>Thử thách (Challenge)</Typography.Text>
            {canManage && (
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
                <List.Item actions={[renderVisibilityAction(c)]}>
                  <List.Item.Meta
                    title={c.title}
                    description={
                      <Space size={4} wrap>
                        <Tag color={TYPE_COLOR[c.type] ?? "default"}>{c.type}</Tag>
                        {statusTag(c.status)}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>

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
          disabled={!canManage}
          occupyingChallenge={activeChallenge(challenges.data)}
          onClose={() => setWizardOpen(false)}
          onMutated={() => challenges.refetch()}
        />
      )}
    </Card>
  );
}
