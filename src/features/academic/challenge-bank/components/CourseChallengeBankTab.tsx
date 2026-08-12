import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Dropdown,
  Empty,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message,
} from "antd";
import type { TableProps } from "antd";
import { EllipsisOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { adminErrorMessage } from "../../../../shared/api/errors";
import type { CourseDetail, CourseTreeNode } from "../../types";
import {
  ChallengeWizardDrawer,
  type WizardLessonGroup,
} from "../../exercises/components/ChallengeWizardDrawer";
import { ChallengeEditModal } from "../../exercises/components/ChallengeEditModal";
import { TestCaseManagerDrawer } from "../../exercises/components/TestCaseManagerDrawer";
import { formatChallengeSchedule } from "../../exercises/challengeSchedule";
import { DeleteConfirmModal } from "../../../../shared/components/DeleteConfirmModal";
import {
  useDeleteChallenge,
  usePublishChallenge,
  useSetChallengeVisibility,
} from "../../exercises/api/exercises.api";
import type { ChallengeView } from "../../exercises/types";
import {
  useBulkAssignChallenges,
  useChallengeCoverage,
  useCourseChallengeBank,
  useSetChallengeLesson,
  type BankChallengeView,
  type BulkAssignResult,
} from "../api/challengeBank.api";

interface CourseChallengeBankTabProps {
  course: CourseDetail;
  /** Quản được challenge (challenge.manage hoặc chủ khoá) — gate mọi hành động ghi. */
  canManage: boolean;
}

interface LessonMeta {
  id: string;
  title: string;
  sectionTitle: string;
}

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: "green",
  RUNNING: "blue",
  DRAFT: "default",
  CLOSED: "red",
  ARCHIVED: "red",
};

function statusTag(status: string) {
  return <Tag color={STATUS_COLOR[status] ?? "default"}>{status || "DRAFT"}</Tag>;
}

/**
 * Nhãn hiển thị của bài học: ƯU TIÊN MÔ TẢ vì `name` hay bị trùng hàng loạt ("[Tài liệu]",
 * "[PREMIUM-MASTER-Thực chiến]"…) — description mới là nội dung thật, phân biệt được. Fallback tên.
 */
function lessonLabel(lesson: CourseTreeNode): string {
  return lesson.description?.trim() || lesson.title?.trim() || "(bài chưa đặt tên)";
}

/** Phẳng hoá cây → map lessonId → {title, sectionTitle} để tra tên bài của challenge. */
function buildLessonMetaMap(sections: CourseTreeNode[]): Map<string, LessonMeta> {
  const map = new Map<string, LessonMeta>();
  for (const section of sections) {
    for (const lesson of section.children ?? []) {
      if (lesson.type === "lesson" && lesson.id) {
        map.set(lesson.id, { id: lesson.id, title: lessonLabel(lesson), sectionTitle: section.title });
      }
    }
  }
  return map;
}

/** Picker gắn-bài (grouped theo chương) cho wizard + Select gán lẻ. */
function buildLessonOptions(sections: CourseTreeNode[]): WizardLessonGroup[] {
  return sections
    .map((section) => ({
      label: section.title || "(chương chưa đặt tên)",
      options: (section.children ?? [])
        .filter((l) => l.type === "lesson" && l.id)
        .map((l) => ({ label: lessonLabel(l), value: l.id as string })),
    }))
    .filter((g) => g.options.length > 0);
}

/**
 * Tab "Kho challenge" của khoá (challenge-bank & lesson-assign). Hai cột:
 *  - TRÁI: cây chương/bài (collapse được), mỗi bài badge số challenge đang gắn; chọn 1 bài = đích gán lô.
 *  - PHẢI: toàn bộ challenge của khoá (mọi status) — filter status / "chưa gắn"; chọn nhiều → gán lô;
 *    mỗi dòng gán/gỡ lẻ, publish, public↔workplace, sửa nhanh.
 * Banner đối soát coverage ở đầu. Không tạo hook/endpoint BE mới ngoài hợp đồng V284 đã cho.
 */
export function CourseChallengeBankTab({ course, canManage }: CourseChallengeBankTabProps) {
  const courseId = course.id;
  const sections = useMemo(
    () => course.tree.filter((n) => n.type === "section"),
    [course.tree]
  );
  const lessonMeta = useMemo(() => buildLessonMetaMap(sections), [sections]);
  const lessonOptions = useMemo(() => buildLessonOptions(sections), [sections]);

  const bank = useCourseChallengeBank(courseId);
  const coverage = useChallengeCoverage(courseId);
  const setLesson = useSetChallengeLesson(courseId);
  const bulkAssign = useBulkAssignChallenges(courseId);
  const setVisibility = useSetChallengeVisibility();
  const publish = usePublishChallenge();
  const deleteChallenge = useDeleteChallenge();

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [onlyUnattached, setOnlyUnattached] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [targetLesson, setTargetLesson] = useState<LessonMeta | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<ChallengeView | null>(null);
  /** challenge-testcase-editor §2.2: challenge đang mở trình soạn test case (Drawer riêng). */
  const [testCaseTarget, setTestCaseTarget] = useState<BankChallengeView | null>(null);
  const [deleting, setDeleting] = useState<BankChallengeView | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkAssignResult[] | null>(null);

  const list = bank.data ?? [];

  /** Số challenge đang gắn theo lessonId (cho badge cây trái). */
  const countByLesson = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of list) if (c.lessonId) m[c.lessonId] = (m[c.lessonId] ?? 0) + 1;
    return m;
  }, [list]);

  const filtered = useMemo(
    () =>
      list.filter(
        (c) =>
          (!statusFilter || c.status === statusFilter) &&
          (!onlyUnattached || c.lessonId == null)
      ),
    [list, statusFilter, onlyUnattached]
  );

  const statusOptions = useMemo(() => {
    const set = new Set<string>(list.map((c) => c.status).filter(Boolean));
    return Array.from(set).map((s) => ({ value: s, label: s }));
  }, [list]);

  const treeData = useMemo(
    () =>
      sections.map((section) => ({
        key: `s:${section.key}`,
        selectable: false,
        title: <Typography.Text strong>{section.title || "(chương chưa đặt tên)"}</Typography.Text>,
        children: (section.children ?? [])
          .filter((l) => l.type === "lesson")
          .map((lesson) => {
            const hasId = Boolean(lesson.id);
            return {
              key: hasId ? `l:${lesson.id}` : lesson.key,
              selectable: hasId,
              disabled: !hasId,
              lessonId: lesson.id,
              lessonTitle: lessonLabel(lesson),
              sectionTitle: section.title,
              title: (
                <Space size={6}>
                  <span>
                    {lessonLabel(lesson)}
                    {lesson.title?.trim() &&
                    lesson.description?.trim() &&
                    lesson.title.trim() !== lesson.description.trim() ? (
                      <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                        · {lesson.title.trim()}
                      </Typography.Text>
                    ) : null}
                  </span>
                  {hasId ? (
                    <Badge
                      count={countByLesson[lesson.id as string] ?? 0}
                      showZero
                      style={{ backgroundColor: (countByLesson[lesson.id as string] ?? 0) > 0 ? "#1677ff" : "#d9d9d9" }}
                    />
                  ) : (
                    <Tag>chưa lưu</Tag>
                  )}
                </Space>
              ),
            };
          }),
      })),
    [sections, countByLesson]
  );

  const doBulkAssign = () => {
    if (!targetLesson || selectedRowKeys.length === 0) return;
    const items = selectedRowKeys.map((id) => ({ challengeId: id, lessonId: targetLesson.id }));
    bulkAssign.mutate(items, {
      onSuccess: (results) => {
        setBulkResult(results);
        const ok = results.filter((r) => r.ok).length;
        if (ok === results.length) {
          message.success(`Đã gán ${ok} challenge vào "${targetLesson.title}"`);
          setSelectedRowKeys([]);
        } else {
          message.warning(`${ok}/${results.length} gán thành công — xem chi tiết lỗi`);
        }
      },
    });
  };

  const doSetLesson = (id: string, lessonId: string | null) => {
    setLesson.mutate(
      { id, lessonId },
      {
        onSuccess: () => message.success(lessonId ? "Đã gắn vào bài" : "Đã gỡ khỏi bài"),
      }
    );
  };

  const doToggleVisibility = (c: BankChallengeView) => {
    const toPublic = c.visibility !== "WORKSPACE_PUBLIC";
    Modal.confirm({
      title: toPublic ? "Public lên Workplace" : "Thu về kho khoá",
      content: toPublic
        ? "Challenge sẽ hiện công khai ở Workplace (mục thực hành). Người ngoài khoá cũng thấy được."
        : "Challenge sẽ biến mất khỏi Workplace; học viên đã enroll vẫn truy cập qua bài đã gắn.",
      okText: toPublic ? "Public" : "Thu về",
      cancelText: "Huỷ",
      onOk: () =>
        setVisibility.mutateAsync({
          id: c.id,
          visibility: toPublic ? "WORKSPACE_PUBLIC" : "COURSE_ONLY",
        }).then(() => message.success("Đã đổi hiển thị")),
    });
  };

  const columns: TableProps<BankChallengeView>["columns"] = [
    {
      title: "Challenge",
      dataIndex: "title",
      render: (_, c) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{c.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {c.type}
            {c.free ? " · học thử" : ""}
          </Typography.Text>
        </Space>
      ),
    },
    { title: "Trạng thái", width: 120, render: (_, c) => statusTag(c.status) },
    {
      // challenge-testcase-editor §4.3: thời gian đóng nay TUỲ CHỌN — hiện "Không giới hạn" khi
      // vắng (hoặc là sentinel 2999 của dữ liệu cũ) thay vì in ra một mốc ngày gây hiểu nhầm.
      title: "Lịch mở → đóng",
      width: 170,
      render: (_, c) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatChallengeSchedule(c.startsAt, c.endsAt)}
        </Typography.Text>
      ),
    },
    {
      title: "Hiển thị",
      width: 150,
      render: (_, c) =>
        c.visibility === "WORKSPACE_PUBLIC" ? (
          <Tag color="purple">Workplace</Tag>
        ) : (
          <Tag>Trong khoá</Tag>
        ),
    },
    {
      title: "Bài học",
      width: 300,
      render: (_, c) => (
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Select
            size="small"
            style={{ width: "100%" }}
            placeholder="Chưa gắn bài — chọn để gắn"
            value={c.lessonId ?? undefined}
            options={lessonOptions}
            disabled={!canManage || setLesson.isPending}
            showSearch
            optionFilterProp="label"
            onChange={(lessonId) => doSetLesson(c.id, lessonId)}
          />
          {c.lessonId && canManage && (
            <Button size="small" danger type="text" onClick={() => doSetLesson(c.id, null)}>
              Gỡ khỏi bài
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: "Thao tác",
      width: 60,
      render: (_, c) => {
        if (!canManage) return null;
        const canPublicToggle = c.status === "PUBLISHED" || c.status === "RUNNING";
        const items = [
          c.status === "DRAFT"
            ? {
                key: "publish",
                label: "Publish",
                onClick: () =>
                  publish
                    .mutateAsync({ id: c.id })
                    .then(() => message.success("Đã publish"))
                    .catch((e) => message.error(adminErrorMessage(e))),
              }
            : null,
          canPublicToggle
            ? {
                key: "visibility",
                label: c.visibility === "WORKSPACE_PUBLIC" ? "Thu về kho" : "Public lên Workplace",
                onClick: () => doToggleVisibility(c),
              }
            : null,
          { key: "edit", label: "Sửa nhanh", onClick: () => setEditing(c) },
          // challenge-testcase-editor §2.2: chỉ thử thách CODE mới có test case chấm tự động.
          c.type === "CODE"
            ? { key: "test-cases", label: "Test case", onClick: () => setTestCaseTarget(c) }
            : null,
          { key: "delete", label: "Xoá", danger: true, onClick: () => setDeleting(c) },
        ].filter(Boolean) as {
          key: string;
          label: string;
          danger?: boolean;
          onClick: () => void;
        }[];
        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button size="small" type="text" icon={<EllipsisOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  const cov = coverage.data;
  const hasGap = cov && (cov.missingAssignmentIds.length > 0 || cov.unattachedChallenges > 0);

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Banner đối soát (2.5) */}
        {coverage.isError ? (
          <Alert
            type="info"
            showIcon
            message="Chưa lấy được báo cáo đối soát"
            description="Endpoint coverage chỉ có sau khi BE V284 được deploy."
          />
        ) : hasGap ? (
          <Alert
            type="warning"
            showIcon
            message="Còn dữ liệu chưa vào khoá"
            description={`Đã migrate ${cov!.migrated}/${cov!.totalAssignments} bài tập · còn ${cov!.missingAssignmentIds.length} bài tập chưa migrate · ${cov!.unattachedChallenges} challenge chưa gắn bài.`}
          />
        ) : cov ? (
          <Alert type="success" showIcon message={`Đã migrate đủ ${cov.migrated}/${cov.totalAssignments} bài tập.`} />
        ) : null}

        {bank.isError && (
          <Alert
            type="error"
            showIcon
            message="Không tải được kho challenge"
            description="Kho challenge cần BE V284 (chưa deploy). Sau khi deploy, bấm Làm mới."
            action={
              <Button size="small" onClick={() => bank.refetch()}>
                Làm mới
              </Button>
            }
          />
        )}

        <Row gutter={16}>
          {/* Cột trái — cây chương/bài */}
          <Col xs={24} md={8}>
            <Card size="small" title="Chương / bài học" styles={{ body: { maxHeight: 560, overflow: "auto" } }}>
              {sections.length === 0 ? (
                <Empty description="Khoá chưa có chương/bài" />
              ) : (
                <Tree
                  treeData={treeData}
                  defaultExpandAll
                  blockNode
                  selectedKeys={targetLesson ? [`l:${targetLesson.id}`] : []}
                  onSelect={(_keys, info) => {
                    const node = info.node as unknown as { lessonId?: string; lessonTitle?: string; sectionTitle?: string };
                    if (node.lessonId) {
                      setTargetLesson({
                        id: node.lessonId,
                        title: node.lessonTitle ?? "",
                        sectionTitle: node.sectionTitle ?? "",
                      });
                    }
                  }}
                />
              )}
            </Card>
          </Col>

          {/* Cột phải — danh sách challenge của khoá */}
          <Col xs={24} md={16}>
            <Card size="small">
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                  <Space wrap>
                    <Select
                      placeholder="Trạng thái"
                      allowClear
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={statusOptions}
                      style={{ minWidth: 150 }}
                    />
                    <Checkbox checked={onlyUnattached} onChange={(e) => setOnlyUnattached(e.target.checked)}>
                      Chỉ chưa gắn bài
                    </Checkbox>
                  </Space>
                  <Space wrap>
                    <Button icon={<ReloadOutlined />} onClick={() => { bank.refetch(); coverage.refetch(); }}>
                      Làm mới
                    </Button>
                    {canManage && (
                      <Button type="dashed" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)}>
                        Thêm challenge
                      </Button>
                    )}
                  </Space>
                </Space>

                {canManage && (
                  <Space wrap>
                    <Tooltip title={targetLesson ? "" : "Chọn 1 bài ở cột trái làm đích"}>
                      <Button
                        type="primary"
                        disabled={!targetLesson || selectedRowKeys.length === 0}
                        loading={bulkAssign.isPending}
                        onClick={doBulkAssign}
                      >
                        Gán {selectedRowKeys.length > 0 ? `${selectedRowKeys.length} ` : ""}vào bài đang chọn
                      </Button>
                    </Tooltip>
                    {targetLesson && (
                      <Typography.Text type="secondary">
                        Đích: <strong>{targetLesson.title}</strong> ({targetLesson.sectionTitle})
                      </Typography.Text>
                    )}
                  </Space>
                )}

                {bank.isLoading && !bank.data ? (
                  <Skeleton active paragraph={{ rows: 6 }} />
                ) : (
                  <Table
                    rowKey="id"
                    size="small"
                    dataSource={filtered}
                    columns={columns}
                    pagination={{ pageSize: 15, showSizeChanger: false }}
                    locale={{ emptyText: bank.isError ? "—" : "Kho chưa có challenge nào" }}
                    rowSelection={
                      canManage
                        ? {
                            selectedRowKeys,
                            onChange: (keys) => setSelectedRowKeys(keys as string[]),
                          }
                        : undefined
                    }
                  />
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>

      {/* Thêm challenge (bankMode: courseId + picker bài, cho bỏ qua = chưa gắn) */}
      {wizardOpen && (
        <ChallengeWizardDrawer
          open
          courseId={courseId}
          lessonOptions={lessonOptions}
          onClose={() => setWizardOpen(false)}
          onMutated={() => {
            bank.refetch();
            coverage.refetch();
          }}
        />
      )}

      {/* Sửa nhanh */}
      {editing && (
        <ChallengeEditModal
          open
          challenge={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            bank.refetch();
          }}
        />
      )}

      {/* Soạn / sửa test case của 1 challenge CODE (challenge-testcase-editor §2.2) */}
      <TestCaseManagerDrawer
        open={testCaseTarget !== null}
        challenge={testCaseTarget}
        disabled={!canManage}
        onClose={() => setTestCaseTarget(null)}
        onSaved={() => bank.refetch()}
      />

      {/* Xoá challenge (hard delete, cần lý do audit) */}
      <DeleteConfirmModal
        open={!!deleting}
        title="Xoá thử thách"
        description={
          <>
            Xoá <strong>{deleting?.title}</strong> là <strong>vĩnh viễn</strong>. Nếu chỉ muốn ẩn:
            dùng Gỡ khỏi bài / Unpublish.
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
              },
            }
          );
        }}
        onCancel={() => setDeleting(null)}
      />

      {/* Kết quả gán lô — lỗi TỪNG DÒNG (không chỉ toast chung) */}
      <Modal
        open={bulkResult !== null}
        title="Kết quả gán hàng loạt"
        footer={<Button onClick={() => setBulkResult(null)}>Đóng</Button>}
        onCancel={() => setBulkResult(null)}
      >
        <Table
          rowKey={(r) => r.challengeId}
          size="small"
          pagination={false}
          dataSource={bulkResult ?? []}
          columns={[
            {
              title: "Challenge",
              render: (_, r) => list.find((c) => c.id === r.challengeId)?.title ?? r.challengeId,
            },
            {
              title: "Bài đích",
              render: (_, r) => lessonMeta.get(r.lessonId)?.title ?? r.lessonId,
            },
            {
              title: "Kết quả",
              width: 200,
              render: (_, r) =>
                r.ok ? (
                  <Tag color="green">OK</Tag>
                ) : (
                  <Tooltip title={r.message ?? r.errorCode ?? ""}>
                    <Tag color="red">{r.errorCode ?? "LỖI"}</Tag>
                  </Tooltip>
                ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
