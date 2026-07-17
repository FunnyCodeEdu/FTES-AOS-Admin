import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMe } from "../../../auth/api";
import { hasPermission } from "../../../../shared/permissions";
import type { CourseDetail, CourseTreeNode } from "../../types";
import {
  ChallengeWizardDrawer,
  type WizardLessonGroup,
} from "../../exercises/components/ChallengeWizardDrawer";
import {
  useCourseChallengeBank,
  useSetChallengeVisibility,
  type BankChallenge,
} from "../api/challengeBank.api";

interface CourseChallengeBankTabProps {
  course: CourseDetail;
}

const CHALLENGE_TYPES = [
  "MULTIPLE_CHOICE",
  "CODE",
  "ESSAY",
  "CODING",
  "SQL",
  "UIUX",
  "AI",
  "BUSINESS",
] as const;

const TYPE_COLOR: Record<string, string> = {
  MULTIPLE_CHOICE: "geekblue",
  CODE: "purple",
  CODING: "purple",
  ESSAY: "magenta",
  SQL: "cyan",
  UIUX: "orange",
  AI: "volcano",
  BUSINESS: "gold",
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

function visibilityTag(v: BankChallenge["visibility"]) {
  return v === "WORKSPACE_PUBLIC" ? (
    <Tag color="gold">Public Workplace</Tag>
  ) : (
    <Tag>Trong kho</Tag>
  );
}

/** Map lessonId → "Section / Lesson" từ cây course (đã load bởi useCourse). */
function buildLessonNameMap(tree: CourseTreeNode[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const section of tree) {
    for (const lesson of section.children ?? []) {
      if (lesson.type === "lesson" && lesson.id) {
        map.set(lesson.id, `${section.title} / ${lesson.title}`);
      }
    }
  }
  return map;
}

/** Nhóm lesson theo section cho picker gắn-bài trong wizard (chỉ lesson của course này). */
function buildLessonOptions(tree: CourseTreeNode[]): WizardLessonGroup[] {
  return tree
    .filter((s) => s.type === "section")
    .map((section) => ({
      label: section.title,
      options: (section.children ?? [])
        .filter((l) => l.type === "lesson" && l.id)
        .map((l) => ({ label: l.title, value: l.id as string })),
    }))
    .filter((g) => g.options.length > 0);
}

export function CourseChallengeBankTab({ course }: CourseChallengeBankTabProps) {
  const { data: me } = useMe();
  const canManage = hasPermission(me?.permissions ?? [], "challenge.manage");

  const bank = useCourseChallengeBank(course.id);
  const setVisibility = useSetChallengeVisibility(course.id);

  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [visibilityFilter, setVisibilityFilter] = useState<string | undefined>(undefined);
  const [wizardOpen, setWizardOpen] = useState(false);
  // Id row đang toggle visibility — chỉ nút của row đó loading, thay vì cả bảng cùng spin
  // (setVisibility.isPending là state chung của 1 mutation).
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const runVisibility = async (id: string, visibility: BankChallenge["visibility"]) => {
    setMutatingId(id);
    try {
      await setVisibility.mutateAsync({ id, visibility });
    } finally {
      setMutatingId(null);
    }
  };

  const lessonNameMap = useMemo(() => buildLessonNameMap(course.tree), [course.tree]);
  const lessonOptions = useMemo(() => buildLessonOptions(course.tree), [course.tree]);

  const rows = useMemo(() => {
    const all = bank.data ?? [];
    return all.filter((c) => {
      if (typeFilter && c.type !== typeFilter) return false;
      if (visibilityFilter && c.visibility !== visibilityFilter) return false;
      return true;
    });
  }, [bank.data, typeFilter, visibilityFilter]);

  const confirmPublish = (row: BankChallenge) => {
    Modal.confirm({
      title: "Public thử thách lên Workplace?",
      content:
        "Thử thách sẽ hiện công khai ở Workplace practice và trang /challenges cho mọi người. Tiếp tục?",
      okText: "Public",
      cancelText: "Huỷ",
      onOk: () => runVisibility(row.id, "WORKSPACE_PUBLIC"),
    });
  };

  const confirmPullBack = (row: BankChallenge) => {
    Modal.confirm({
      title: "Thu thử thách về kho?",
      content:
        "Thử thách sẽ biến mất khỏi Workplace; học viên đã enroll vẫn truy cập qua bài học đã gắn. Thu về?",
      okText: "Thu về kho",
      cancelText: "Huỷ",
      onOk: () => runVisibility(row.id, "COURSE_ONLY"),
    });
  };

  const renderVisibilityAction = (row: BankChallenge) => {
    if (row.visibility === "WORKSPACE_PUBLIC") {
      const btn = (
        <Button
          size="small"
          onClick={() => confirmPullBack(row)}
          disabled={!canManage}
          loading={mutatingId === row.id}
        >
          Thu về kho
        </Button>
      );
      return canManage ? (
        btn
      ) : (
        <Tooltip title="Cần quyền quản lý thử thách (challenge.manage)">{btn}</Tooltip>
      );
    }
    // COURSE_ONLY → nút Public, enable khi PUBLISHED/RUNNING + có quyền.
    const active = row.status === "PUBLISHED" || row.status === "RUNNING";
    const enabled = active && canManage;
    const reason = !canManage
      ? "Cần quyền quản lý thử thách (challenge.manage)"
      : !active
        ? "Chỉ thử thách đang hoạt động (PUBLISHED/RUNNING) mới public được"
        : "";
    const btn = (
      <Button
        type="primary"
        size="small"
        onClick={() => confirmPublish(row)}
        disabled={!enabled}
        loading={mutatingId === row.id}
      >
        Public lên Workplace
      </Button>
    );
    return enabled ? btn : <Tooltip title={reason}>{btn}</Tooltip>;
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder="Loại"
          style={{ width: 200 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={CHALLENGE_TYPES.map((t) => ({ label: t, value: t }))}
        />
        <Select
          allowClear
          placeholder="Hiển thị"
          style={{ width: 200 }}
          value={visibilityFilter}
          onChange={setVisibilityFilter}
          options={[
            { label: "Trong kho", value: "COURSE_ONLY" },
            { label: "Public Workplace", value: "WORKSPACE_PUBLIC" },
          ]}
        />
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)}>
            Thêm thử thách
          </Button>
        )}
      </Space>

      {bank.isError && (
        <Alert type="error" message={bank.error?.message} style={{ marginBottom: 16 }} />
      )}

      <Table<BankChallenge>
        rowKey="id"
        size="small"
        loading={bank.isLoading}
        dataSource={rows}
        pagination={false}
        locale={{
          emptyText: (
            <Empty description="Kho chưa có thử thách">
              {canManage && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)}>
                  Thêm thử thách
                </Button>
              )}
            </Empty>
          ),
        }}
        columns={[
          {
            title: "Tên",
            dataIndex: "title",
            render: (_, row) => (
              <div>
                <div>{row.title}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {row.slug}
                </Typography.Text>
              </div>
            ),
          },
          {
            title: "Loại",
            dataIndex: "type",
            width: 150,
            render: (t: string) => <Tag color={TYPE_COLOR[t] ?? "default"}>{t}</Tag>,
          },
          {
            title: "Trạng thái",
            dataIndex: "status",
            width: 130,
            render: (s: string) => statusTag(s),
          },
          {
            title: "Hiển thị",
            dataIndex: "visibility",
            width: 160,
            render: (v: BankChallenge["visibility"]) => visibilityTag(v),
          },
          {
            title: "Lesson gắn",
            dataIndex: "lessonId",
            width: 220,
            render: (lessonId: string | null) =>
              lessonId ? (
                lessonNameMap.get(lessonId) ?? (
                  <Typography.Text type="secondary">(ngoài khoá này)</Typography.Text>
                )
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              ),
          },
          {
            title: "Hành động",
            width: 220,
            render: (_, row) => <Space>{renderVisibilityAction(row)}</Space>,
          },
        ]}
      />

      {wizardOpen && (
        <ChallengeWizardDrawer
          open={wizardOpen}
          courseId={course.id}
          lessonOptions={lessonOptions}
          disabled={!canManage}
          onClose={() => setWizardOpen(false)}
          onMutated={() => bank.refetch()}
        />
      )}
    </div>
  );
}
