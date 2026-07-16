import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMe } from "../../../auth/api";
import { hasPermission } from "../../../../shared/permissions";
import {
  useLessonAssignments,
  useLessonChallenges,
  useLessonQuizzes,
} from "../api/exercises.api";
import type { AssignmentView, ChallengeView, QuizSummaryView } from "../types";
import { AddExerciseModal, type ExerciseKind } from "./AddExerciseModal";
import { AssignmentFormModal } from "./AssignmentFormModal";
import { ChallengeWizardDrawer } from "./ChallengeWizardDrawer";
import { QuizComposerDrawer } from "./QuizComposerDrawer";

interface LessonExercisesTabProps {
  lessonId: string;
  /** courseId đến từ LessonEditPage (dùng cho gate quyền phía trên); tab tự gate theo permission. */
  courseId?: string;
  /** true = chỉ đọc (không quản được course). */
  disabled?: boolean;
}

function quizStatusTag(status: string) {
  if (status === "PUBLISHED") return <Tag color="green">PUBLISHED</Tag>;
  if (status === "ARCHIVED") return <Tag>ARCHIVED</Tag>;
  return <Tag color="orange">DRAFT</Tag>;
}

export function LessonExercisesTab({ lessonId, disabled }: LessonExercisesTabProps) {
  const { data: me } = useMe();
  const canManageChallenge = hasPermission(me?.permissions ?? [], "challenge.manage");

  const quizzes = useLessonQuizzes(lessonId);
  const assignments = useLessonAssignments(lessonId);
  const challenges = useLessonChallenges(lessonId, canManageChallenge);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [quizDrawer, setQuizDrawer] = useState<{ open: boolean; quiz: QuizSummaryView | null }>({
    open: false,
    quiz: null,
  });
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);

  const nextAssignmentSort = assignments.data?.length ?? 0;

  // Challenge active đang chiếm chỗ lesson (status khác ARCHIVED).
  const occupyingChallenge = useMemo<ChallengeView | null>(
    () => challenges.data?.find((c) => c.status !== "ARCHIVED") ?? null,
    [challenges.data]
  );

  const handlePick = (kind: ExerciseKind) => {
    setPickerOpen(false);
    if (kind === "quiz") setQuizDrawer({ open: true, quiz: null });
    else if (kind === "assignment") setAssignmentOpen(true);
    else setChallengeOpen(true);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} align="center">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
        >
          Thêm bài tập
        </Button>
        {disabled && <Typography.Text type="secondary">Chế độ chỉ đọc</Typography.Text>}
      </Space>

      {/* Quiz */}
      <Card size="small" title="Quiz trắc nghiệm" style={{ marginBottom: 16 }}>
        {quizzes.isError && <Alert type="error" message={quizzes.error?.message} />}
        <Table<QuizSummaryView>
          rowKey="id"
          size="small"
          loading={quizzes.isLoading}
          dataSource={quizzes.data ?? []}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có quiz" /> }}
          columns={[
            { title: "Tiêu đề", dataIndex: "title" },
            {
              title: "Số câu",
              dataIndex: "questionCount",
              width: 90,
              align: "center",
            },
            {
              title: "Điểm đạt",
              dataIndex: "passScorePercent",
              width: 90,
              align: "center",
              render: (v: number) => `${v}%`,
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 130,
              render: (s: string) => quizStatusTag(s),
            },
            {
              title: "",
              width: 100,
              render: (_, row) => (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setQuizDrawer({ open: true, quiz: row })}
                >
                  {disabled ? "Xem" : "Quản lý"}
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {/* Assignment */}
      <Card size="small" title="Assignment (nộp GitHub)" style={{ marginBottom: 16 }}>
        {assignments.isError && <Alert type="error" message={assignments.error?.message} />}
        <Table<AssignmentView>
          rowKey="id"
          size="small"
          loading={assignments.isLoading}
          dataSource={assignments.data ?? []}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có assignment" /> }}
          columns={[
            { title: "Tiêu đề", dataIndex: "title" },
            {
              title: "Định dạng",
              dataIndex: "fileExtension",
              width: 120,
              render: (v: string | null) => v || "—",
            },
            {
              title: "Lần nộp",
              dataIndex: "maxSubmissions",
              width: 90,
              align: "center",
            },
            {
              title: "Miễn phí",
              dataIndex: "free",
              width: 90,
              align: "center",
              render: (v: boolean) => (v ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>),
            },
            { title: "Thứ tự", dataIndex: "sortOrder", width: 80, align: "center" },
          ]}
        />
      </Card>

      {/* Challenge */}
      {canManageChallenge && (
        <Card size="small" title="Challenge" style={{ marginBottom: 16 }}>
          {challenges.isError && <Alert type="error" message={challenges.error?.message} />}
          <Table<ChallengeView>
            rowKey="id"
            size="small"
            loading={challenges.isLoading}
            dataSource={challenges.data ?? []}
            pagination={false}
            locale={{ emptyText: <Empty description="Chưa có challenge" /> }}
            columns={[
              { title: "Tiêu đề", dataIndex: "title" },
              { title: "Loại", dataIndex: "type", width: 150 },
              {
                title: "Trạng thái",
                dataIndex: "status",
                width: 130,
                render: (s: string) => (
                  <Tag color={s === "ARCHIVED" ? "default" : "blue"}>{s}</Tag>
                ),
              },
            ]}
          />
        </Card>
      )}

      <AddExerciseModal
        open={pickerOpen}
        allowChallenge={canManageChallenge && !disabled}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
      />

      {quizDrawer.open && (
        <QuizComposerDrawer
          lessonId={lessonId}
          quiz={quizDrawer.quiz}
          open={quizDrawer.open}
          disabled={disabled}
          onClose={() => setQuizDrawer({ open: false, quiz: null })}
        />
      )}

      <AssignmentFormModal
        lessonId={lessonId}
        open={assignmentOpen}
        nextSortOrder={nextAssignmentSort}
        disabled={disabled}
        onClose={() => setAssignmentOpen(false)}
      />

      {challengeOpen && (
        <ChallengeWizardDrawer
          lessonId={lessonId}
          open={challengeOpen}
          disabled={disabled || !canManageChallenge}
          occupyingChallenge={occupyingChallenge}
          onClose={() => setChallengeOpen(false)}
        />
      )}
    </div>
  );
}
