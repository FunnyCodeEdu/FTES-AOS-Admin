// Tab "EXP kỹ năng" của trang khoá học — change `admin-course-skill-exp` trên hợp đồng BE
// `course-skill-exp`.
//
// Nghiệp vụ: mỗi khoá cấp EXP cho một số NHÓM KỸ NĂNG. Admin/mentor dán syllabus, AI chấm ra
// "nhóm nào bao nhiêu EXP và vì sao", rồi NGƯỜI soát lại — sửa số, thêm nhóm AI bỏ sót, xoá nhóm
// chấm sai — trước khi chốt. Học viên KHÔNG nhận trọn một lần: BE trả dần ở mốc tiến độ
// 30/50/80/100% (cộng dồn, không cộng trùng), nên con số nhập ở đây luôn là EXP TOÀN KHOÁ.
//
// Hai luật cứng của màn này:
//   1. AI chỉ ĐỀ XUẤT — bảng vẫn sửa được và chỉ có hiệu lực sau khi người bấm Lưu.
//   2. Evaluate LỖI thì KHÔNG được làm trắng bảng: lỗi hiện ra, phân bổ đang có giữ nguyên
//      (đúng scenario "Evaluation unavailable" của spec BE).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { TableProps } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SaveOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { adminErrorMessage } from "../../../../shared/api/errors";
import {
  MAX_SKILL_EXP,
  MIN_SKILL_EXP,
  availableCategoryOptions,
  milestoneBreakdown,
  rowsEqual,
  useCourseSkillExp,
  useEvaluateCourseSkillExp,
  useSaveCourseSkillExp,
  useSkillCategories,
  validateSkillExpRows,
  type CourseSkillExpRow,
  type SkillCategory,
} from "../api/courses.api";

interface CourseSkillExpTabProps {
  courseId: string;
}

/** Dòng đang sửa. `key` là khoá React ổn định — dòng mới CHƯA có nhóm nên không dùng slug làm key. */
export interface SkillExpDraftRow extends CourseSkillExpRow {
  key: string;
}

/** Gắn khoá React cho bộ dòng đọc từ server (index-based: bộ này thay nguyên khối, không trộn). */
export function toDraftRows(rows: CourseSkillExpRow[], keyPrefix = "saved"): SkillExpDraftRow[] {
  return rows.map((row, index) => ({ ...row, key: `${keyPrefix}-${index}` }));
}

/** Bỏ khoá React để so sánh / dựng payload. */
export function stripDraftKeys(rows: SkillExpDraftRow[]): CourseSkillExpRow[] {
  return rows.map((row) => ({
    categorySlug: row.categorySlug,
    ...(row.categoryLabel ? { categoryLabel: row.categoryLabel } : {}),
    exp: row.exp,
    rationale: row.rationale,
    ...(row.source ? { source: row.source } : {}),
  }));
}

/** "30% → +30 · 50% → +20 · 80% → +30 · 100% → +20" — luật trả điểm hiện ngay cạnh ô nhập. */
export function formatMilestoneHint(exp: number): string {
  return milestoneBreakdown(exp)
    .map((m) => `${m.percent}% → +${m.award}`)
    .join(" · ");
}

/** Slug đang lưu nhưng KHÔNG có trong danh mục (BE đổi danh mục sau khi khoá đã cấu hình). */
export function isUnknownCategory(slug: string, categories: SkillCategory[]): boolean {
  if (!slug) return false;
  if (categories.length === 0) return false; // danh mục chưa tải xong — chưa kết luận được.
  return !categories.some((c) => c.slug === slug);
}

/**
 * Options cho Select của MỘT dòng: nhóm chưa dùng ở dòng khác, cộng thêm chính nhóm của dòng này
 * kể cả khi nó không còn trong danh mục — không có nó thì Select hiện ô trống và người sửa tưởng
 * dòng bị mất nhóm. Nhãn của nhóm lạ lấy từ `categoryLabel` BE trả kèm, không có thì hiện slug.
 */
export function categorySelectOptions(
  categories: SkillCategory[],
  rows: CourseSkillExpRow[],
  currentSlug: string,
  currentLabel?: string
): Array<{ value: string; label: string }> {
  const options = availableCategoryOptions(categories, rows, currentSlug);
  if (currentSlug && !options.some((o) => o.value === currentSlug)) {
    options.unshift({ value: currentSlug, label: currentLabel?.trim() || currentSlug });
  }
  return options;
}

export function CourseSkillExpTab({ courseId }: CourseSkillExpTabProps) {
  const categoriesQuery = useSkillCategories();
  const savedQuery = useCourseSkillExp(courseId);
  const evaluate = useEvaluateCourseSkillExp(courseId);
  const save = useSaveCourseSkillExp(courseId);

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const saved = useMemo(() => savedQuery.data ?? [], [savedQuery.data]);

  const [syllabus, setSyllabus] = useState("");
  // `null` = chưa seed từ server. Seed ĐÚNG MỘT LẦN rồi thôi: các lượt refetch sau (kể cả lượt do
  // evaluate/save invalidate) KHÔNG được đạp lên phần người đang sửa dở.
  const [draft, setDraft] = useState<SkillExpDraftRow[] | null>(null);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [evaluateEmpty, setEvaluateEmpty] = useState(false);
  // Phần BE báo lại về chất lượng đầu ra của AI: slug bịa (bị bỏ) và EXP vô lý (bị kẹp về [1..1000]).
  const [aiWarnings, setAiWarnings] = useState<{ ignored: string[]; clamped: string[] }>({
    ignored: [],
    clamped: [],
  });
  const nextKey = useRef(0);

  useEffect(() => {
    if (draft === null && savedQuery.isSuccess) setDraft(toDraftRows(saved));
  }, [draft, saved, savedQuery.isSuccess]);

  const rows = draft ?? [];
  const plainRows = useMemo(() => stripDraftKeys(rows), [rows]);
  const errors = useMemo(
    () => validateSkillExpRows(plainRows, categories),
    [plainRows, categories]
  );
  const dirty = draft !== null && !rowsEqual(plainRows, saved);
  // KHÔNG đọc được phân bổ đang lưu ⇒ KHÓA mọi đường ghi. Cả PUT lẫn evaluate đều là replace-set:
  // ghi khi bảng đang trống vì lỗi tải sẽ đạp mất một phân bổ mà người dùng CHƯA HỀ nhìn thấy.
  const writesBlocked = savedQuery.isError;
  const totalExp = plainRows.reduce((sum, row) => sum + (row.exp > 0 ? row.exp : 0), 0);

  function replaceRows(next: CourseSkillExpRow[]) {
    nextKey.current += 1;
    setDraft(toDraftRows(next, `ai-${nextKey.current}`));
  }

  function patchRow(key: string, patch: Partial<CourseSkillExpRow>) {
    setDraft((current) =>
      (current ?? []).map((row) => (row.key === key ? { ...row, ...patch, source: "MANUAL" } : row))
    );
  }

  function handleAddRow() {
    nextKey.current += 1;
    const key = `new-${nextKey.current}`;
    setDraft((current) => [
      ...(current ?? []),
      { key, categorySlug: "", exp: 10, rationale: "", source: "MANUAL" },
    ]);
  }

  function handleRemoveRow(key: string) {
    setDraft((current) => (current ?? []).filter((row) => row.key !== key));
  }

  function runEvaluate() {
    setEvaluateError(null);
    setEvaluateEmpty(false);
    setAiWarnings({ ignored: [], clamped: [] });
    evaluate.mutate(
      { syllabus: syllabus.trim() },
      {
        onSuccess: (result) => {
          setAiWarnings({ ignored: result.ignoredSlugs, clamped: result.clampedSlugs });
          // BE đã cam kết không bao giờ replace bằng rỗng (502 CAREER_SKILL_EXP_AI_EMPTY), nhưng
          // FE vẫn tự giữ: rỗng ⇒ báo và GIỮ NGUYÊN bảng, không bao giờ xoá theo kết quả rỗng.
          if (result.rows.length === 0) {
            setEvaluateEmpty(true);
            return;
          }
          replaceRows(result.rows);
          message.success(`AI đã đề xuất ${result.rows.length} nhóm kỹ năng — hãy soát lại rồi Lưu`);
        },
        // Lỗi: `handleAdminMutationError` đã bắn notification; giữ thêm một Alert tại chỗ và
        // TUYỆT ĐỐI không đụng vào `draft` (phân bổ đang có phải còn nguyên).
        onError: (err) => setEvaluateError(adminErrorMessage(err)),
      }
    );
  }

  function handleEvaluate() {
    if (!syllabus.trim()) {
      message.warning("Dán nội dung syllabus của khoá trước khi nhờ AI chấm");
      return;
    }
    if (rows.length > 0) {
      Modal.confirm({
        title: "Chấm lại bằng AI?",
        content:
          "Kết quả AI sẽ THAY phân bổ đang có trong bảng (máy chủ cũng lưu lại bản AI này). Phần chỉnh tay chưa lưu sẽ mất. Nếu AI lỗi, bảng hiện tại được giữ nguyên.",
        okText: "Chấm lại",
        cancelText: "Huỷ",
        onOk: runEvaluate,
      });
      return;
    }
    runEvaluate();
  }

  function handleSave() {
    if (errors.length > 0) {
      message.error(errors[0]);
      return;
    }
    save.mutate(plainRows, {
      onSuccess: () => message.success("Đã lưu phân bổ EXP kỹ năng của khoá"),
    });
  }

  function handleReset() {
    setDraft(toDraftRows(saved));
    setEvaluateEmpty(false);
    setEvaluateError(null);
    setAiWarnings({ ignored: [], clamped: [] });
  }

  const columns: TableProps<SkillExpDraftRow>["columns"] = [
    {
      title: "Nhóm kỹ năng",
      dataIndex: "categorySlug",
      width: 240,
      render: (slug: string, record) => (
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
          <Select
            style={{ width: "100%" }}
            placeholder="Chọn nhóm kỹ năng"
            value={slug || undefined}
            loading={categoriesQuery.isLoading}
            showSearch
            optionFilterProp="label"
            options={categorySelectOptions(categories, plainRows, slug, record.categoryLabel)}
            onChange={(value: string) => patchRow(record.key, { categorySlug: value })}
            status={slug ? undefined : "error"}
          />
          {isUnknownCategory(slug, categories) && (
            <Tag color="warning">Không có trong danh mục</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "EXP toàn khoá",
      dataIndex: "exp",
      width: 140,
      render: (exp: number, record) => (
        <InputNumber
          min={MIN_SKILL_EXP}
          max={MAX_SKILL_EXP}
          step={5}
          precision={0}
          style={{ width: "100%" }}
          value={exp}
          status={
            Number.isInteger(exp) && exp >= MIN_SKILL_EXP && exp <= MAX_SKILL_EXP
              ? undefined
              : "error"
          }
          onChange={(value) => patchRow(record.key, { exp: typeof value === "number" ? value : 0 })}
        />
      ),
    },
    {
      title: "Trả dần theo mốc tiến độ",
      dataIndex: "exp",
      key: "milestones",
      width: 260,
      render: (exp: number) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatMilestoneHint(exp)}
        </Typography.Text>
      ),
    },
    {
      title: "Lý do (AI giải thích / ghi chú của bạn)",
      dataIndex: "rationale",
      render: (rationale: string, record) => (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          value={rationale}
          placeholder="Vì sao khoá này cấp EXP cho nhóm đó"
          onChange={(e) => patchRow(record.key, { rationale: e.target.value })}
        />
      ),
    },
    {
      title: "Nguồn",
      dataIndex: "source",
      width: 100,
      render: (source: CourseSkillExpRow["source"]) =>
        source === "AI" ? <Tag color="blue">AI</Tag> : <Tag>Người sửa</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_: unknown, record) => (
        <Popconfirm
          title="Xoá nhóm này khỏi phân bổ?"
          description="Chỉ xoá khỏi bảng — có hiệu lực sau khi bấm Lưu phân bổ."
          okText="Xoá"
          okButtonProps={{ danger: true }}
          cancelText="Huỷ"
          onConfirm={() => handleRemoveRow(record.key)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="AI đề xuất — người quyết định"
        description={
          <>
            <Typography.Paragraph style={{ marginBottom: 4 }}>
              Dán syllabus rồi để AI chấm xem khoá này bồi cho nhóm kỹ năng nào, bao nhiêu EXP và vì
              sao. Kết quả AI chỉ là <b>đề xuất</b>: hãy soát từng dòng, sửa/thêm/xoá rồi bấm{" "}
              <b>Lưu phân bổ</b> — con số cuối cùng là con số bạn lưu.
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              Số EXP nhập ở đây là <b>phần thưởng cho việc học XONG khoá</b>. Học viên nhận dần theo
              tiến độ: <b>30% · 50% · 80% · 100%</b> — mỗi mốc trả phần chênh so với mốc đã đạt, học
              hết khoá là vừa đúng con số này (không nhiều hơn, không nhận lại lần hai).
            </Typography.Paragraph>
          </>
        }
      />

      <Card size="small" title="Syllabus của khoá" style={{ marginBottom: 16 }}>
        <Input.TextArea
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
          autoSize={{ minRows: 5, maxRows: 16 }}
          placeholder="Dán đề cương / mục tiêu / danh sách chủ đề của khoá vào đây (nếu là file, hãy trích text rồi dán)."
          disabled={evaluate.isPending}
        />
        <Space style={{ marginTop: 12 }} wrap>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            loading={evaluate.isPending}
            disabled={!syllabus.trim() || writesBlocked}
            onClick={handleEvaluate}
          >
            Để AI chấm
          </Button>
          {evaluate.isPending && (
            <Space size={8}>
              <Spin size="small" />
              <Typography.Text type="secondary">
                AI đang đọc syllabus và chấm EXP cho từng nhóm kỹ năng…
              </Typography.Text>
            </Space>
          )}
        </Space>
      </Card>

      {evaluateError && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setEvaluateError(null)}
          style={{ marginBottom: 16 }}
          message="AI chấm không thành công"
          description={`${evaluateError} — phân bổ đang có được giữ nguyên, bạn có thể thử lại hoặc nhập tay bên dưới.`}
        />
      )}

      {evaluateEmpty && (
        <Alert
          type="warning"
          showIcon
          closable
          onClose={() => setEvaluateEmpty(false)}
          style={{ marginBottom: 16 }}
          message="AI không trả về nhóm kỹ năng nào dùng được"
          description="Bảng bên dưới được giữ nguyên. Thử dán syllabus chi tiết hơn, hoặc tự thêm nhóm."
        />
      )}

      {(aiWarnings.ignored.length > 0 || aiWarnings.clamped.length > 0) && (
        <Alert
          type="warning"
          showIcon
          closable
          onClose={() => setAiWarnings({ ignored: [], clamped: [] })}
          style={{ marginBottom: 16 }}
          message="AI trả về vài chỗ không dùng nguyên được"
          description={
            <>
              {aiWarnings.ignored.length > 0 && (
                <div>
                  Nhóm AI bịa (không có trong danh mục) đã bị bỏ:{" "}
                  <b>{aiWarnings.ignored.join(", ")}</b>. Nếu khoá thực sự bồi mảng đó, hãy thêm
                  nhóm bằng tay.
                </div>
              )}
              {aiWarnings.clamped.length > 0 && (
                <div>
                  EXP vượt khoảng cho phép ({MIN_SKILL_EXP}–{MAX_SKILL_EXP}) đã bị kẹp lại:{" "}
                  <b>{aiWarnings.clamped.join(", ")}</b>. Soát lại con số trước khi lưu.
                </div>
              )}
            </>
          }
        />
      )}

      {savedQuery.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được phân bổ EXP đang lưu"
          description={`${adminErrorMessage(savedQuery.error)} — mọi thao tác ghi (AI chấm / Lưu) tạm khoá để không đè mất phân bổ chưa đọc được. Hãy thử tải lại.`}
          action={
            <Button icon={<ReloadOutlined />} onClick={() => savedQuery.refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      {categoriesQuery.isError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được danh mục nhóm kỹ năng"
          description={`${adminErrorMessage(categoriesQuery.error)} — các dòng vẫn hiện theo mã nhóm, nhưng chưa thêm được nhóm mới.`}
        />
      )}

      {errors.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Chưa lưu được — còn dòng chưa hợp lệ"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          }
        />
      )}

      <Card
        size="small"
        title="Phân bổ EXP theo nhóm kỹ năng"
        extra={
          <Space wrap>
            <Button
              icon={<PlusOutlined />}
              onClick={handleAddRow}
              disabled={writesBlocked || availableCategoryOptions(categories, plainRows).length === 0}
            >
              Thêm nhóm
            </Button>
            <Button icon={<UndoOutlined />} onClick={handleReset} disabled={!dirty}>
              Hoàn tác
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={save.isPending}
              disabled={!dirty || errors.length > 0 || writesBlocked}
              onClick={handleSave}
            >
              Lưu phân bổ
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="key"
          size="small"
          columns={columns}
          dataSource={rows}
          loading={savedQuery.isLoading}
          pagination={false}
          scroll={{ x: 1080 }}
          locale={{
            emptyText:
              "Khoá này chưa cấp EXP kỹ năng nào. Dán syllabus để AI chấm, hoặc bấm “Thêm nhóm” để nhập tay.",
          }}
          footer={
            rows.length > 0
              ? () => (
                  <Typography.Text type="secondary">
                    Tổng {totalExp} EXP trên {rows.length} nhóm — trả hết khi học viên hoàn thành
                    100% khoá.
                  </Typography.Text>
                )
              : undefined
          }
        />
      </Card>
    </div>
  );
}
