import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { CourseSelect } from "../../components/CourseSelect";
import { useCourse, useCourses } from "../../courses/api/courses.api";
import type { CourseTreeNode } from "../../types";
import {
  useAddChallengePlacement,
  useChallengePlacements,
  useRemoveChallengePlacement,
} from "../api/challengeBankConsole.api";
import type { BankChallengeRow, ChallengePlacementView } from "../types";

interface ChallengePlacementsModalProps {
  open: boolean;
  challenge: BankChallengeRow | null;
  disabled?: boolean;
  onClose: () => void;
  /** Gọi sau khi thêm/gỡ để caller refetch kho (cột "đang dùng ở N bài"). */
  onChanged?: () => void;
}

/** Nhóm bài học theo chương cho Select (mirror `buildLessonOptions` của tab kho-theo-khoá). */
function buildLessonGroups(tree: CourseTreeNode[] | undefined) {
  return (tree ?? [])
    .filter((n) => n.type === "section")
    .map((section) => ({
      label: section.title || "(chương chưa đặt tên)",
      options: (section.children ?? [])
        .filter((l) => l.type === "lesson" && l.id)
        .map((l) => ({ label: l.title || "(bài chưa đặt tên)", value: l.id as string })),
    }))
    .filter((g) => g.options.length > 0);
}

function buildLessonTitleMap(tree: CourseTreeNode[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const section of tree ?? []) {
    for (const lesson of section.children ?? []) {
      if (lesson.type === "lesson" && lesson.id) {
        map.set(lesson.id, `${lesson.title || "(bài chưa đặt tên)"} · ${section.title}`);
      }
    }
  }
  return map;
}

/**
 * "Khoá học NHẶT bài từ kho" — quản chỗ dùng (placement) của một thử thách.
 *
 * Ngôn từ ở đây là cố ý: BE có HAI thao tác khác nhau và trước change này UI chỉ có cái sai.
 *  - `PUT /admin/challenges/{id}/lesson` = **CHUYỂN** chỗ (bài cũ mất challenge).
 *  - `POST /admin/challenges/{id}/placements` = **THÊM** chỗ dùng, bài cũ giữ nguyên.
 * Màn này chỉ dùng cái thứ hai, và nhãn nút nói đúng là "Thêm chỗ dùng" — không có chữ nào gợi ý
 * rằng gắn vào khoá mới sẽ gỡ khỏi khoá cũ.
 */
export function ChallengePlacementsModal({
  open,
  challenge,
  disabled,
  onClose,
  onChanged,
}: ChallengePlacementsModalProps) {
  const challengeId = challenge?.id;
  const placements = useChallengePlacements(challengeId, open);
  const addPlacement = useAddChallengePlacement();
  const removePlacement = useRemoveChallengePlacement();

  const [courseId, setCourseId] = useState<string | undefined>();
  const [lessonId, setLessonId] = useState<string | undefined>();

  const course = useCourse(courseId);
  const lessonGroups = useMemo(() => buildLessonGroups(course.data?.tree), [course.data]);
  // Tên bài chỉ tra được cho khoá ĐANG mở ở ô chọn (mỗi khoá là một truy vấn cây riêng; nạp cây của
  // mọi khoá xuất hiện trong danh sách chỗ dùng sẽ là N request cho một bảng vài dòng). Chỗ dùng
  // thuộc khoá khác hiện tên khoá + id bài rút gọn — thật thà hơn là bịa một cái tên.
  const lessonTitles = useMemo(() => buildLessonTitleMap(course.data?.tree), [course.data]);

  const courses = useCourses({ page: 1, pageSize: 1000 });
  const courseNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses.data?.items ?? []) map.set(c.id, c.name);
    return map;
  }, [courses.data]);

  const doAdd = () => {
    if (!challengeId || !lessonId) return;
    addPlacement.mutate(
      { id: challengeId, lessonId },
      {
        onSuccess: () => {
          message.success("Đã thêm chỗ dùng — thử thách vẫn giữ nguyên các bài đang dùng khác");
          setLessonId(undefined);
          onChanged?.();
        },
      }
    );
  };

  const doRemove = (placement: ChallengePlacementView) => {
    if (!challengeId) return;
    Modal.confirm({
      title: "Gỡ chỗ dùng này",
      content:
        "Chỉ gỡ thử thách khỏi ĐÚNG bài học này; thử thách vẫn ở lại kho và ở những bài còn lại.",
      okText: "Gỡ",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () =>
        removePlacement
          .mutateAsync({ id: challengeId, lessonId: placement.lessonId })
          .then(() => {
            message.success("Đã gỡ chỗ dùng");
            onChanged?.();
          }),
    });
  };

  const rows = placements.data ?? [];

  return (
    <Modal
      title="Chỗ dùng của thử thách"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
      width={760}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {challenge && (
          <Typography.Text>
            Thử thách: <strong>{challenge.title}</strong>
          </Typography.Text>
        )}

        {placements.isError && (
          <Alert
            type="error"
            showIcon
            message="Không đọc được danh sách chỗ dùng"
            description={adminErrorMessage(placements.error)}
            action={
              <Button size="small" onClick={() => placements.refetch()}>
                Thử lại
              </Button>
            }
          />
        )}

        {placements.isLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : rows.length === 0 ? (
          <Empty description="Chưa khoá nào dùng thử thách này" />
        ) : (
          <Table<ChallengePlacementView>
            rowKey={(r) => r.id ?? `${r.lessonId}`}
            size="small"
            pagination={false}
            dataSource={rows}
            columns={[
              {
                title: "Bài học",
                render: (_, r) => (
                  <Space direction="vertical" size={0}>
                    <Typography.Text>
                      {lessonTitles.get(r.lessonId) ?? `Bài ${r.lessonId.slice(0, 8)}…`}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {r.courseId
                        ? (courseNames.get(r.courseId) ?? `Khoá ${r.courseId.slice(0, 8)}…`)
                        : "Chưa rõ khoá"}
                    </Typography.Text>
                  </Space>
                ),
              },
              {
                title: "Thứ tự",
                width: 90,
                render: (_, r) => <Tag>{r.orderNo}</Tag>,
              },
              {
                title: "",
                width: 90,
                render: (_, r) =>
                  disabled ? null : (
                    <Button
                      size="small"
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => doRemove(r)}
                    >
                      Gỡ
                    </Button>
                  ),
              },
            ]}
          />
        )}

        {!disabled && (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Typography.Text strong>Thêm chỗ dùng</Typography.Text>
            <Space wrap>
              <CourseSelect
                value={courseId}
                onChange={(value) => {
                  setCourseId(value);
                  setLessonId(undefined);
                }}
                placeholder="Chọn khoá học"
              />
              <Select
                style={{ minWidth: 280 }}
                placeholder={courseId ? "Chọn bài học" : "Chọn khoá trước"}
                disabled={!courseId}
                loading={course.isLoading}
                value={lessonId}
                onChange={setLessonId}
                options={lessonGroups}
                showSearch
                optionFilterProp="label"
                allowClear
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!lessonId}
                loading={addPlacement.isPending}
                onClick={doAdd}
              >
                Thêm chỗ dùng
              </Button>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Thêm chỗ dùng <strong>không</strong> gỡ thử thách khỏi các bài đang dùng — một bài toán
              trong kho có thể phục vụ nhiều khoá cùng lúc. Thêm lại đúng bài đã có thì không tạo bản
              trùng.
            </Typography.Text>
          </Space>
        )}
      </Space>
    </Modal>
  );
}
