import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { EditOutlined, FileSearchOutlined, FormOutlined } from "@ant-design/icons";
import { useCourseStudents } from "../../courses/api/courses.api";
import {
  type BankChallengeView,
  type ChallengeSubmissionAttempt,
  useChallengeSubmissionAttempts,
  useChallengeSubmissionSummary,
} from "../../challenge-bank/api/challengeBank.api";
import { ChallengeEditModal } from "../../exercises/components/ChallengeEditModal";
import { ChallengeFreeTag } from "./ChallengeFreeTag";
import { mergeSubmissionRoster, type SubmissionRosterRow } from "./submissionRoster";

function statusTag(status?: string) {
  const color = status === "SCORED" ? "green" : status === "FAILED" ? "red" : "processing";
  return <Tag color={color}>{status || "CHƯA NỘP"}</Tag>;
}

function payloadLabel(value?: string) {
  if (value === "URL") return "GitHub / đường dẫn";
  if (value === "FILE") return "Tệp bài làm";
  if (value === "CODE") return "Code trực tiếp";
  if (value === "MCQ") return "Trắc nghiệm";
  return value || "—";
}

function prettyAnswers(raw: string | null) {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function AttemptContent({ attempt }: { attempt: ChallengeSubmissionAttempt }) {
  const answers = prettyAnswers(attempt.answers);
  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="Cách nộp">{payloadLabel(attempt.payloadType)}</Descriptions.Item>
        <Descriptions.Item label="Ngôn ngữ">{attempt.language || "—"}</Descriptions.Item>
        <Descriptions.Item label="Điểm tự động">{attempt.autoScore ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Điểm thủ công">{attempt.manualScore ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Model chấm">{attempt.gradingModel || "—"}</Descriptions.Item>
        <Descriptions.Item label="Chấm bằng test case">
          {attempt.testCaseGraded == null ? "—" : attempt.testCaseGraded ? "Có" : "Không"}
        </Descriptions.Item>
      </Descriptions>
      {attempt.url && (
        <Typography.Link href={attempt.url} target="_blank" rel="noreferrer">
          Mở đường dẫn bài nộp
        </Typography.Link>
      )}
      {attempt.hasStoredFile && <Alert type="info" showIcon message="Lần nộp này có tệp đính kèm" />}
      {attempt.codeContent && (
        <div>
          <Typography.Text strong>Code đã nộp</Typography.Text>
          <pre style={{ whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto" }}>
            {attempt.codeContent}
          </pre>
        </div>
      )}
      {answers && (
        <div>
          <Typography.Text strong>Câu trả lời</Typography.Text>
          <pre style={{ whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto" }}>{answers}</pre>
        </div>
      )}
    </Space>
  );
}

function StudentAttemptsDrawer({
  courseId,
  challengeId,
  student,
  onClose,
}: {
  courseId: string;
  challengeId: string;
  student: SubmissionRosterRow | null;
  onClose: () => void;
}) {
  const attempts = useChallengeSubmissionAttempts(courseId, challengeId, student?.userId);
  return (
    <Drawer
      open={Boolean(student)}
      onClose={onClose}
      width={760}
      title={student ? `Bài nộp · ${student.username || student.email}` : "Bài nộp"}
    >
      {attempts.isError ? (
        <Alert type="error" showIcon message={attempts.error.message} />
      ) : !attempts.isLoading && (attempts.data?.length ?? 0) === 0 ? (
        <Empty description="Học viên chưa nộp bài" />
      ) : (
        <Collapse
          accordion
          items={(attempts.data ?? []).map((attempt) => ({
            key: attempt.id,
            label: (
              <Space wrap>
                <strong>Lần {attempt.attemptNo}</strong>
                {statusTag(attempt.status)}
                <Tag>{payloadLabel(attempt.payloadType)}</Tag>
                <span>{new Date(attempt.submittedAt).toLocaleString("vi-VN")}</span>
                <strong>{attempt.finalScore == null ? "Chưa có điểm" : `${attempt.finalScore} điểm`}</strong>
              </Space>
            ),
            children: <AttemptContent attempt={attempt} />,
          }))}
        />
      )}
    </Drawer>
  );
}

function ChallengeSubmissionsDrawer({
  courseId,
  challenge,
  onClose,
}: {
  courseId: string;
  challenge: BankChallengeView | null;
  onClose: () => void;
}) {
  const roster = useCourseStudents(challenge ? courseId : undefined);
  const summaries = useChallengeSubmissionSummary(courseId, challenge?.id);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [student, setStudent] = useState<SubmissionRosterRow | null>(null);
  const rows = useMemo(() => {
    const merged = mergeSubmissionRoster(roster.data?.students ?? [], summaries.data ?? []);
    const q = search.trim().toLowerCase();
    return merged.filter((row) => {
      if (filter === "SUBMITTED" && !row.submitted) return false;
      if (filter === "MISSING" && row.submitted) return false;
      return !q || `${row.username} ${row.email}`.toLowerCase().includes(q);
    });
  }, [filter, roster.data?.students, search, summaries.data]);
  const total = roster.data?.students.length ?? 0;
  const submitted = (roster.data?.students ?? []).filter((row) =>
    (summaries.data ?? []).some((summary) => summary.userId === row.userId),
  ).length;
  const columns: TableProps<SubmissionRosterRow>["columns"] = [
    {
      title: "Học viên",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <strong>{row.username || row.userId}</strong>
          <Typography.Text type="secondary">{row.email || row.userId}</Typography.Text>
          {row.outsideCurrentRoster && <Tag color="orange">Không còn trong danh sách khóa</Tag>}
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      width: 130,
      render: (_, row) => (row.submitted ? statusTag(row.summary?.latestStatus) : <Tag>Chưa nộp</Tag>),
    },
    { title: "Số lần", width: 80, render: (_, row) => row.summary?.attemptCount ?? 0 },
    { title: "Điểm tốt nhất", width: 110, render: (_, row) => row.summary?.bestScore ?? "—" },
    {
      title: "Nộp gần nhất",
      width: 170,
      render: (_, row) =>
        row.summary?.lastSubmittedAt
          ? new Date(row.summary.lastSubmittedAt).toLocaleString("vi-VN")
          : "—",
    },
    {
      title: "Thao tác",
      width: 100,
      render: (_, row) => (
        <Button size="small" disabled={!row.submitted} onClick={() => setStudent(row)}>
          Xem bài
        </Button>
      ),
    },
  ];
  return (
    <>
      <Drawer
        open={Boolean(challenge)}
        onClose={onClose}
        width={1050}
        title={challenge ? `Quản lý bài nộp · ${challenge.title}` : "Quản lý bài nộp"}
      >
        {(roster.isError || summaries.isError) && (
          <Alert
            type="error"
            showIcon
            message={roster.error?.message || summaries.error?.message}
            style={{ marginBottom: 16 }}
          />
        )}
        <Space size="large" wrap style={{ marginBottom: 16 }}>
          <Statistic title="Học viên trong khóa" value={total} />
          <Statistic title="Đã nộp" value={submitted} valueStyle={{ color: "#389e0d" }} />
          <Statistic title="Chưa nộp" value={Math.max(total - submitted, 0)} />
        </Space>
        <Space wrap style={{ marginBottom: 12 }}>
          <Segmented
            value={filter}
            onChange={(value) => setFilter(String(value))}
            options={[
              { label: "Tất cả", value: "ALL" },
              { label: "Đã nộp", value: "SUBMITTED" },
              { label: "Chưa nộp", value: "MISSING" },
            ]}
          />
          <Input.Search
            allowClear
            placeholder="Tìm tên hoặc email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 280 }}
          />
        </Space>
        <Table
          rowKey="userId"
          size="small"
          loading={roster.isLoading || summaries.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Drawer>
      {challenge && (
        <StudentAttemptsDrawer
          courseId={courseId}
          challengeId={challenge.id}
          student={student}
          onClose={() => setStudent(null)}
        />
      )}
    </>
  );
}

export function LessonChallengeChildren({
  courseId,
  challenges,
  canManage,
}: {
  courseId: string;
  challenges: BankChallengeView[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<BankChallengeView | null>(null);
  const [reporting, setReporting] = useState<BankChallengeView | null>(null);
  if (challenges.length === 0) return null;
  return (
    <div style={{ margin: "0 12px 12px 44px" }}>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        {challenges.map((challenge, index) => (
          <div
            key={challenge.id}
            style={{
              padding: "10px 12px",
              borderBottom: index + 1 < challenges.length ? "1px solid #f0f0f0" : undefined,
              background: "#fafcff",
            }}
          >
            <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
              <Space wrap>
                <FormOutlined style={{ color: "#597ef7" }} />
                <Typography.Text strong>{challenge.title}</Typography.Text>
                <Tag color="blue">{challenge.type}</Tag>
                <Tag>{challenge.status}</Tag>
                <ChallengeFreeTag free={challenge.free} />
                {challenge.endsAt && (
                  <Typography.Text type="secondary">
                    Đóng {new Date(challenge.endsAt).toLocaleString("vi-VN")}
                  </Typography.Text>
                )}
              </Space>
              {canManage && (
                <Space>
                  <Button
                    size="small"
                    icon={<FileSearchOutlined />}
                    onClick={() => setReporting(challenge)}
                  >
                    Bài nộp
                  </Button>
                  <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(challenge)}>
                    Sửa
                  </Button>
                </Space>
              )}
            </Space>
          </div>
        ))}
      </Card>
      <ChallengeEditModal
        open={Boolean(editing)}
        challenge={editing}
        disabled={!canManage}
        onClose={() => setEditing(null)}
      />
      <ChallengeSubmissionsDrawer
        courseId={courseId}
        challenge={reporting}
        onClose={() => setReporting(null)}
      />
    </div>
  );
}
