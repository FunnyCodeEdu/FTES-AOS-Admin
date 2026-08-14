import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  InputNumber,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { TableProps } from "antd";
import { DeleteOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { adminErrorMessage } from "../../../../shared/api/errors";
import {
  DEFAULT_SKILL_TARGET_LEVEL,
  DEFAULT_SKILL_UNLOCK_AT_PERCENT,
  DEFAULT_SKILL_WEIGHT,
  useCareerSkills,
  useCourseSkills,
  useSaveCourseSkills,
  type CareerSkill,
  type CourseSkillLink,
} from "../api/courseSkills.api";

interface CourseSkillsTabProps {
  courseId: string;
  /** Có `career.manage` — thiếu thì chỉ xem, mọi ô nhập/nút lưu bị khoá. */
  canManage: boolean;
}

/**
 * Dòng đang soạn. Số để NULL được vì InputNumber cho phép xoá trắng ô; ép về số ngay lúc gõ sẽ
 * khiến admin không xoá nổi ký tự cuối. Chặn null ở bước validate trước khi PUT.
 */
interface SkillRowDraft {
  skillId: string;
  weight: number | null;
  targetLevel: number | null;
  unlockAtPercent: number | null;
}

function toDraft(link: CourseSkillLink): SkillRowDraft {
  return {
    skillId: link.skillId,
    weight: link.weight ?? DEFAULT_SKILL_WEIGHT,
    targetLevel: link.targetLevel ?? DEFAULT_SKILL_TARGET_LEVEL,
    unlockAtPercent: link.unlockAtPercent ?? DEFAULT_SKILL_UNLOCK_AT_PERCENT,
  };
}

function newDraft(skillId: string): SkillRowDraft {
  return {
    skillId,
    weight: DEFAULT_SKILL_WEIGHT,
    targetLevel: DEFAULT_SKILL_TARGET_LEVEL,
    unlockAtPercent: DEFAULT_SKILL_UNLOCK_AT_PERCENT,
  };
}

const LEVEL_LABEL: Record<number, string> = {
  1: "1 — Biết",
  2: "2 — Làm được cơ bản",
  3: "3 — Làm độc lập",
  4: "4 — Thành thạo",
  5: "5 — Dẫn dắt / dạy lại",
};

/** So sánh nông theo skillId + 3 giá trị để biết còn thay đổi chưa lưu hay không. */
function sameAsServer(rows: SkillRowDraft[], server: CourseSkillLink[]): boolean {
  if (rows.length !== server.length) return false;
  const byId = new Map(server.map((s) => [s.skillId, s]));
  return rows.every((row) => {
    const s = byId.get(row.skillId);
    if (!s) return false;
    return (
      row.weight === s.weight &&
      row.targetLevel === s.targetLevel &&
      row.unlockAtPercent === s.unlockAtPercent
    );
  });
}

/**
 * Khu vực "Kỹ năng khoá này dạy" — admin chọn kỹ năng từ danh mục career rồi chỉnh trọng số,
 * mức độ mục tiêu và mốc % hoàn thành để mở khoá. Lưu bằng PUT THAY THẾ TOÀN BỘ danh sách:
 * gỡ một dòng khỏi bảng rồi bấm Lưu = xoá liên kết đó ở BE.
 */
export function CourseSkillsTab({ courseId, canManage }: CourseSkillsTabProps) {
  const catalog = useCareerSkills();
  const current = useCourseSkills(courseId);
  const save = useSaveCourseSkills(courseId);

  const [rows, setRows] = useState<SkillRowDraft[]>([]);

  // Seed lại mỗi khi BE trả dữ liệu mới (lần đầu, sau refetch, sau khi lưu xong).
  useEffect(() => {
    if (!current.data) return;
    setRows(current.data.map(toDraft));
  }, [current.data]);

  const skillById = useMemo(() => {
    const map = new Map<string, CareerSkill>();
    for (const skill of catalog.data ?? []) map.set(skill.id, skill);
    return map;
  }, [catalog.data]);

  // Gom theo nhóm cho ô chọn; kỹ năng không có category dồn vào "Khác".
  const selectOptions = useMemo(() => {
    const groups = new Map<string, Array<{ value: string; label: string }>>();
    for (const skill of catalog.data ?? []) {
      const key = skill.category?.trim() || "Khác";
      const list = groups.get(key) ?? [];
      list.push({ value: skill.id, label: `${skill.name} (${skill.slug})` });
      groups.set(key, list);
    }
    return [...groups.entries()].map(([label, options]) => ({ label, options }));
  }, [catalog.data]);

  const selectedIds = useMemo(() => rows.map((r) => r.skillId), [rows]);
  const dirty = !sameAsServer(rows, current.data ?? []);

  /** Ô chọn nhiều: giữ nguyên dòng đã chỉnh, chỉ thêm dòng mới (giá trị mặc định) / bỏ dòng gỡ. */
  const handleSelectChange = (ids: string[]) => {
    const keep = new Set(ids);
    const existing = rows.filter((row) => keep.has(row.skillId));
    const known = new Set(existing.map((row) => row.skillId));
    const added = ids.filter((id) => !known.has(id)).map(newDraft);
    setRows([...existing, ...added]);
  };

  const patchRow = (skillId: string, patch: Partial<SkillRowDraft>) => {
    setRows((prev) => prev.map((row) => (row.skillId === skillId ? { ...row, ...patch } : row)));
  };

  const handleReset = () => setRows((current.data ?? []).map(toDraft));

  const handleSave = () => {
    for (const row of rows) {
      const name = skillById.get(row.skillId)?.name ?? row.skillId;
      if (row.weight == null || row.weight < 0 || row.weight > 1) {
        message.error(`Trọng số của "${name}" phải trong khoảng 0–1`);
        return;
      }
      if (row.targetLevel == null || row.targetLevel < 1 || row.targetLevel > 5) {
        message.error(`Mức độ mục tiêu của "${name}" phải trong khoảng 1–5`);
        return;
      }
      if (row.unlockAtPercent == null || row.unlockAtPercent < 0 || row.unlockAtPercent > 100) {
        message.error(`% hoàn thành của "${name}" phải trong khoảng 0–100`);
        return;
      }
    }
    const payload: CourseSkillLink[] = rows.map((row) => ({
      skillId: row.skillId,
      weight: row.weight as number,
      targetLevel: row.targetLevel as number,
      unlockAtPercent: row.unlockAtPercent as number,
    }));
    // Lỗi đã có notification tiếng Việt từ `handleAdminMutationError` ở tầng hook.
    save.mutate(payload, {
      onSuccess: () => message.success("Đã lưu kỹ năng của khoá học"),
    });
  };

  const columns: TableProps<SkillRowDraft>["columns"] = [
    {
      title: "Kỹ năng",
      dataIndex: "skillId",
      render: (_: unknown, row) => {
        const skill = skillById.get(row.skillId);
        if (!skill) {
          return (
            <Space direction="vertical" size={0}>
              <Typography.Text>{row.skillId}</Typography.Text>
              <Typography.Text type="warning" style={{ fontSize: 12 }}>
                Không còn trong danh mục kỹ năng — gỡ dòng này rồi lưu nếu không dùng nữa.
              </Typography.Text>
            </Space>
          );
        }
        return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{skill.name}</Typography.Text>
            <Space size={4}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {skill.slug}
              </Typography.Text>
              {skill.category ? <Tag>{skill.category}</Tag> : null}
            </Space>
          </Space>
        );
      },
    },
    {
      title: (
        <Tooltip title="Khoá này đóng góp bao nhiêu vào kỹ năng (0 = không đáng kể, 1 = dạy trọn vẹn).">
          <span>Trọng số</span>
        </Tooltip>
      ),
      dataIndex: "weight",
      width: 140,
      render: (_: unknown, row) => (
        <InputNumber
          value={row.weight}
          onChange={(v) => patchRow(row.skillId, { weight: typeof v === "number" ? v : null })}
          disabled={!canManage}
          min={0}
          max={1}
          step={0.1}
          style={{ width: 110 }}
        />
      ),
    },
    {
      title: (
        <Tooltip title="Mức thành thạo học viên đạt được sau khi hoàn thành khoá.">
          <span>Mức độ mục tiêu</span>
        </Tooltip>
      ),
      dataIndex: "targetLevel",
      width: 220,
      render: (_: unknown, row) => (
        <Select
          value={row.targetLevel ?? undefined}
          onChange={(v) => patchRow(row.skillId, { targetLevel: v })}
          disabled={!canManage}
          style={{ width: 190 }}
          options={[1, 2, 3, 4, 5].map((level) => ({ value: level, label: LEVEL_LABEL[level] }))}
        />
      ),
    },
    {
      title: (
        <Tooltip title="Học viên phải hoàn thành bao nhiêu % khoá thì kỹ năng này mới được mở/ghi nhận.">
          <span>% hoàn thành để mở</span>
        </Tooltip>
      ),
      dataIndex: "unlockAtPercent",
      width: 160,
      render: (_: unknown, row) => (
        <InputNumber
          value={row.unlockAtPercent}
          onChange={(v) =>
            patchRow(row.skillId, { unlockAtPercent: typeof v === "number" ? v : null })
          }
          disabled={!canManage}
          min={0}
          max={100}
          step={5}
          addonAfter="%"
          style={{ width: 130 }}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_: unknown, row) =>
        canManage ? (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="Gỡ kỹ năng"
            onClick={() => setRows((prev) => prev.filter((r) => r.skillId !== row.skillId))}
          />
        ) : null,
    },
  ];

  if (current.isLoading || catalog.isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (current.isError) {
    return (
      <Alert
        type="error"
        message="Không tải được kỹ năng của khoá học"
        description={adminErrorMessage(current.error)}
        action={
          <Button icon={<ReloadOutlined />} onClick={() => current.refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Khai báo khoá học này dạy những kỹ năng nào. Mỗi kỹ năng có trọng số (0–1), mức độ mục tiêu
        (1–5) và mốc % hoàn thành để ghi nhận — để trống là dùng mặc định {DEFAULT_SKILL_WEIGHT} /{" "}
        {DEFAULT_SKILL_TARGET_LEVEL} / {DEFAULT_SKILL_UNLOCK_AT_PERCENT}%.
      </Typography.Paragraph>

      {!canManage && (
        <Alert
          type="info"
          showIcon
          message="Bạn chỉ có quyền xem — cần quyền career.manage để chỉnh sửa kỹ năng của khoá."
        />
      )}

      {catalog.isError && (
        <Alert
          type="warning"
          showIcon
          message="Không tải được danh mục kỹ năng"
          description={`${adminErrorMessage(catalog.error)} Danh sách bên dưới vẫn hiển thị theo mã kỹ năng.`}
          action={
            <Button icon={<ReloadOutlined />} onClick={() => catalog.refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      <Select
        mode="multiple"
        value={selectedIds}
        onChange={handleSelectChange}
        disabled={!canManage}
        loading={catalog.isLoading}
        options={selectOptions}
        optionFilterProp="label"
        placeholder="Chọn kỹ năng khoá này dạy"
        style={{ width: "100%", maxWidth: 720 }}
      />

      <Table<SkillRowDraft>
        rowKey="skillId"
        size="small"
        pagination={false}
        dataSource={rows}
        columns={columns}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa khai báo kỹ năng nào cho khoá này"
            />
          ),
        }}
      />

      {canManage && (
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={save.isPending}
            disabled={!dirty}
            onClick={handleSave}
          >
            Lưu kỹ năng
          </Button>
          <Button onClick={handleReset} disabled={!dirty || save.isPending}>
            Hoàn tác
          </Button>
          {dirty && (
            <Typography.Text type="warning">Có thay đổi chưa lưu</Typography.Text>
          )}
        </Space>
      )}
    </Space>
  );
}
