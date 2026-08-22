import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Skeleton,
  Space,
  Tag,
  Tree,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { CourseDetail, CoursePackage, CourseTreeNode, CourseType } from "../../types";
import type { LessonType } from "../../lessons/types";
import type { PackageEntitlementFormValues, PackageFormValues } from "../api/courses.api";
import {
  buildPackagePayload,
  entitlementToRequest,
  isPackageArchived,
  nextPackageSortOrder,
  preservedEntitlementFields,
  preservedPartLadder,
  useArchiveCoursePackage,
  useCoursePackages,
  useCreateCoursePackage,
  useReactivateCoursePackage,
  useUpdateCoursePackage,
  useUpdateCoursePricing,
} from "../api/courses.api";

interface PricingTabProps {
  course: CourseDetail;
  readOnly?: boolean;
}

export interface TreeOption {
  value: string;
  label: string;
  /** B6: mô tả bài học — hiển thị dòng phụ trong option (optionRender). */
  description?: string | null;
  /** B6: loại bài — quyết định editor học thử inline (% cho DOCUMENT, giây cho VIDEO). */
  lessonType?: LessonType;
}

/** Section của khoá → options Select (node không có id là node draft chưa lưu, bỏ qua). */
export function sectionOptionsFromTree(tree: CourseTreeNode[]): TreeOption[] {
  return tree
    .filter((node) => node.type === "section" && !!node.id)
    .map((node) => ({ value: node.id as string, label: node.title }));
}

/** Mọi bài học trong khoá → options Select; node "assignment" là khái niệm FE-only nên bị loại. */
export function lessonOptionsFromTree(tree: CourseTreeNode[]): TreeOption[] {
  const options: TreeOption[] = [];
  for (const section of tree) {
    for (const child of section.children ?? []) {
      if (child.type !== "lesson" || !child.id) continue;
      options.push({
        value: child.id,
        label: `${section.title} / ${child.title}`,
        description: child.description,
        lessonType: child.lessonType,
      });
    }
  }
  return options;
}

/** B6: option 2 dòng — tên bài (nhãn) + mô tả (phụ). Dùng cho các Select chọn bài trong editor gói. */
function renderLessonOption(option: TreeOption) {
  return (
    <Space direction="vertical" size={0}>
      <span>{option.label}</span>
      {option.description ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {option.description}
        </Typography.Text>
      ) : null}
    </Space>
  );
}

/** Khoá LEGACY chưa quản được gói; thiếu quyền cũng vậy → khu vực gói chỉ đọc, không nút ghi nào. */
export function isPackageAreaReadOnly(saleMode: CourseType | undefined, readOnly?: boolean): boolean {
  return saleMode === "LEGACY" || !!readOnly;
}

/** PackageView của BE → giá trị form (giữ `raw` để không mất entitlement editor chưa hỗ trợ). */
export function packageToFormValues(pkg: CoursePackage): PackageFormValues {
  return {
    name: pkg.name,
    slug: pkg.slug,
    salePrice: pkg.salePrice ?? undefined,
    originalPrice: pkg.originalPrice ?? undefined,
    sortOrder: pkg.sortOrder ?? undefined,
    defaultPackage: pkg.defaultPackage ?? false,
    entitlements: (pkg.entitlements ?? []).map((e) => ({
      type: e.type,
      sectionId: e.sectionId ?? undefined,
      selectedLessonIds: e.selectedLessonIds ?? [],
      freeLessonIds: e.freeLessonIds ?? [],
      raw: entitlementToRequest(e),
    })),
  };
}

/** id bài → nhãn "Phần / Bài"; id không còn trong cây vẫn hiện raw để admin thấy nó tồn tại. */
function lessonLabel(id: string, lessonOptions: TreeOption[]): string {
  return lessonOptions.find((o) => o.value === id)?.label ?? id;
}

/**
 * Câu mô tả phần quyền editor KHÔNG có ô nhập nhưng vẫn gửi lại nguyên bản khi lưu. Không hiển thị
 * thì admin lưu mù: dòng PART dạng ladder trông y hệt dòng "trọn phần", còn bài lẻ `lessonId` và
 * quyền bài tập thì vô hình.
 */
export function preservedScopeHints(
  row: PackageEntitlementFormValues,
  lessonOptions: TreeOption[]
): string[] {
  const hints: string[] = [];
  const ladder = preservedPartLadder(row);
  if (ladder) {
    hints.push(
      `Gói chỉ cấp ${ladder.length} bài đã chọn trong phần này (KHÔNG phải trọn phần): ` +
        ladder.map((id) => lessonLabel(id, lessonOptions)).join(", ") +
        ". Giữ nguyên khi lưu; đổi sang phần khác sẽ thành cấp trọn phần."
    );
  }
  const preserved = preservedEntitlementFields(row);
  if (preserved.lessonId) {
    hints.push(
      `Kèm 1 bài gán từ trước: ${lessonLabel(preserved.lessonId, lessonOptions)} — giữ nguyên khi lưu.`
    );
  }
  if (preserved.selectedExerciseIds?.length) {
    hints.push(`Kèm ${preserved.selectedExerciseIds.length} bài tập — giữ nguyên khi lưu.`);
  }
  if (preserved.freeExerciseIds?.length) {
    hints.push(
      `Kèm ${preserved.freeExerciseIds.length} bài tập học thử miễn phí — giữ nguyên khi lưu.`
    );
  }
  return hints;
}

/** Cây khoá → [{phần, bài[]}] cho bộ chọn phạm vi (bỏ node nháp chưa có id). */
export function sectionsWithLessons(
  tree: CourseTreeNode[]
): Array<{ id: string; title: string; lessons: Array<{ id: string; title: string }> }> {
  return tree
    .filter((node) => node.type === "section" && !!node.id)
    .map((node) => ({
      id: node.id as string,
      title: node.title,
      lessons: (node.children ?? [])
        .filter((child) => child.type === "lesson" && !!child.id)
        .map((child) => ({ id: child.id as string, title: child.title })),
    }));
}

/**
 * Subset bài THỰC TẾ của một dòng PART: dòng admin vừa chọn lại thì lấy đúng lựa chọn (rỗng = trọn
 * phần); dòng đọc-về-để-nguyên thì lấy ladder trong `raw` như cũ. undefined = cấp TRỌN phần.
 */
export function effectiveLadder(row: PackageEntitlementFormValues): string[] | undefined {
  if (row.type !== "PART") return undefined;
  if (row.scopeEdited) return row.selectedLessonIds?.length ? row.selectedLessonIds : undefined;
  return row.selectedLessonIds?.length ? row.selectedLessonIds : preservedPartLadder(row);
}

export interface EntitlementSummary {
  kind: string;
  color?: string;
  title: string;
  /** Danh sách bài (dài) — hiển thị rút gọn 2 dòng + tooltip, không đổ hết ra màn hình như trước. */
  detail?: string;
  freeCount: number;
  preserved: string[];
}

/** Một dòng quyền → tóm tắt ngắn để hiện trong danh sách (thay cho cụm select + đoạn văn dài). */
export function entitlementSummary(
  row: PackageEntitlementFormValues,
  sectionOptions: TreeOption[],
  lessonOptions: TreeOption[]
): EntitlementSummary {
  const freeCount = row.freeLessonIds?.length ?? 0;
  const preserved: string[] = [];
  const kept = preservedEntitlementFields(row);
  if (kept.lessonId) {
    preserved.push(`Kèm 1 bài gán từ trước: ${lessonLabel(kept.lessonId, lessonOptions)}.`);
  }
  if (kept.selectedExerciseIds?.length) {
    preserved.push(`Kèm ${kept.selectedExerciseIds.length} bài tập — giữ nguyên khi lưu.`);
  }
  if (kept.freeExerciseIds?.length) {
    preserved.push(`Kèm ${kept.freeExerciseIds.length} bài tập học thử — giữ nguyên khi lưu.`);
  }
  if (row.type === "EXERCISE") {
    return {
      kind: "Bài tập",
      title: "Quyền bài tập",
      detail: "Editor chưa hỗ trợ sửa — lưu gói vẫn giữ nguyên.",
      freeCount,
      preserved,
    };
  }
  if (row.type === "COURSE") {
    return {
      kind: "Trọn khoá",
      color: "blue",
      title: "Cấp trọn khoá",
      detail: "Gồm cả phần/bài thêm sau.",
      freeCount,
      preserved,
    };
  }
  if (row.type === "PART") {
    const name =
      sectionOptions.find((o) => o.value === row.sectionId)?.label ??
      row.sectionId ??
      "(chưa chọn phần)";
    const ladder = effectiveLadder(row);
    if (ladder) {
      return {
        kind: "Phần",
        color: "gold",
        title: `${name} — ${ladder.length} bài`,
        detail: ladder.map((id) => lessonLabel(id, lessonOptions)).join(", "),
        freeCount,
        preserved,
      };
    }
    return { kind: "Phần", color: "green", title: `${name} — trọn phần`, freeCount, preserved };
  }
  const ids = row.selectedLessonIds ?? [];
  return {
    kind: "Bài",
    color: "purple",
    title: `${ids.length} bài chọn riêng`,
    detail: ids.map((id) => lessonLabel(id, lessonOptions)).join(", "),
    freeCount,
    preserved,
  };
}

type ScopeMode = "COURSE" | "SCOPE";

interface EntitlementScopeModalProps {
  open: boolean;
  tree: CourseTreeNode[];
  lessonOptions: TreeOption[];
  /** Dòng đang sửa; undefined = thêm mới. */
  editing?: PackageEntitlementFormValues;
  onCancel: () => void;
  onSubmit: (rows: PackageEntitlementFormValues[]) => void;
}

/**
 * Bộ chọn phạm vi quyền: một cây tick phần/bài thay cho cụm "Loại + Select phần + Select bài" cũ.
 * Tick CẢ PHẦN = cấp trọn phần; tick vài BÀI trong phần = chỉ cấp mấy bài đó (ladder — trước đây
 * editor không dựng được, chỉ đọc từ dữ liệu cũ). Mỗi phần được chọn thành MỘT dòng quyền.
 */
function EntitlementScopeModal({
  open,
  tree,
  lessonOptions,
  editing,
  onCancel,
  onSubmit,
}: EntitlementScopeModalProps) {
  const sections = useMemo(() => sectionsWithLessons(tree), [tree]);
  const [mode, setMode] = useState<ScopeMode>("SCOPE");
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [freeLessonIds, setFreeLessonIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setFreeLessonIds(editing?.freeLessonIds ?? []);
    if (!editing || editing.type === "COURSE") {
      setMode(editing?.type === "COURSE" ? "COURSE" : "SCOPE");
      setCheckedKeys([]);
      return;
    }
    setMode("SCOPE");
    if (editing.type === "PART") {
      const ladder = effectiveLadder(editing);
      const section = sections.find((s) => s.id === editing.sectionId);
      if (ladder) {
        setCheckedKeys(ladder.map((id) => `l:${id}`));
      } else if (section) {
        setCheckedKeys(
          section.lessons.length > 0
            ? section.lessons.map((l) => `l:${l.id}`)
            : [`s:${section.id}`]
        );
      } else {
        setCheckedKeys([]);
      }
      return;
    }
    setCheckedKeys((editing.selectedLessonIds ?? []).map((id) => `l:${id}`));
  }, [open, editing, sections]);

  const treeData = useMemo(
    () =>
      sections.map((section) => ({
        key: `s:${section.id}`,
        title: section.title,
        children: section.lessons.map((lesson) => ({
          key: `l:${lesson.id}`,
          title: lesson.title,
        })),
      })),
    [sections]
  );

  const handleOk = () => {
    const free = freeLessonIds.length > 0 ? freeLessonIds : undefined;
    if (mode === "COURSE") {
      onSubmit([
        {
          type: "COURSE",
          selectedLessonIds: [],
          freeLessonIds: free,
          scopeEdited: true,
          ...(editing?.raw ? { raw: editing.raw } : {}),
        },
      ]);
      return;
    }
    const checkedLessons = new Set(
      checkedKeys.filter((k) => k.startsWith("l:")).map((k) => k.slice(2))
    );
    // Sửa một dòng "chọn bài" cũ: giữ nguyên kiểu LESSON để không đổi hình dạng dữ liệu sẵn có.
    if (editing?.type === "LESSON") {
      if (checkedLessons.size === 0) {
        message.warning("Chọn ít nhất một bài");
        return;
      }
      onSubmit([
        {
          type: "LESSON",
          selectedLessonIds: [...checkedLessons],
          freeLessonIds: free,
          scopeEdited: true,
          ...(editing.raw ? { raw: editing.raw } : {}),
        },
      ]);
      return;
    }
    const rows: PackageEntitlementFormValues[] = [];
    for (const section of sections) {
      const chosen = section.lessons.filter((l) => checkedLessons.has(l.id));
      const emptySectionPicked =
        section.lessons.length === 0 && checkedKeys.includes(`s:${section.id}`);
      if (chosen.length === 0 && !emptySectionPicked) continue;
      const whole = emptySectionPicked || chosen.length === section.lessons.length;
      rows.push({
        type: "PART",
        sectionId: section.id,
        // rỗng = trọn phần (kèm cờ scopeEdited để payload hiểu đúng ý muốn).
        selectedLessonIds: whole ? [] : chosen.map((l) => l.id),
        scopeEdited: true,
        // Giữ `raw` cho ĐÚNG phần đang sửa — quyền bài tập/lessonId cũ không bị rơi khi PATCH.
        ...(editing?.type === "PART" && editing.sectionId === section.id && editing.raw
          ? { raw: editing.raw }
          : {}),
      });
    }
    if (rows.length === 0) {
      message.warning("Chọn ít nhất một phần hoặc một bài");
      return;
    }
    rows[0].freeLessonIds = free;
    onSubmit(rows);
  };

  return (
    <Modal
      open={open}
      title={editing ? "Sửa phạm vi quyền" : "Thêm quyền truy cập"}
      onCancel={onCancel}
      onOk={handleOk}
      okText={editing ? "Lưu phạm vi" : "Thêm quyền"}
      cancelText="Huỷ"
      width={640}
      destroyOnClose
    >
      <Segmented
        block
        value={mode}
        onChange={(value) => setMode(value as ScopeMode)}
        options={[
          { label: "Trọn khoá", value: "COURSE" },
          { label: "Chọn phần / bài", value: "SCOPE" },
        ]}
      />
      {mode === "COURSE" ? (
        <Alert
          style={{ marginTop: 12 }}
          type="info"
          showIcon
          message="Cấp trọn khoá"
          description="Gồm mọi phần/bài hiện có và cả phần/bài thêm sau — không cần chọn phạm vi."
        />
      ) : (
        <>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 8 }}>
            Tick cả <strong>phần</strong> để cấp trọn phần, hoặc tick từng <strong>bài</strong> để chỉ
            cấp mấy bài đó. Mỗi phần được chọn sẽ thành một dòng quyền.
          </Typography.Paragraph>
          {treeData.length === 0 ? (
            <Empty description="Khoá chưa có phần/bài nào" />
          ) : (
            <Tree
              checkable
              selectable={false}
              height={300}
              treeData={treeData}
              checkedKeys={checkedKeys}
              onCheck={(keys) =>
                setCheckedKeys((Array.isArray(keys) ? keys : keys.checked).map(String))
              }
            />
          )}
        </>
      )}
      <Divider style={{ margin: "12px 0" }} />
      <Typography.Text strong>Mở miễn phí cho mọi người</Typography.Text>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: "4px 0 8px" }}>
        Các bài này mở FULL cho mọi người kể cả chưa mua — KHÔNG phải học thử cắt %/giây (cấu hình học
        thử ở tab Học thử của bài).
      </Typography.Paragraph>
      <Select
        mode="multiple"
        style={{ width: "100%" }}
        options={lessonOptions}
        value={freeLessonIds}
        onChange={setFreeLessonIds}
        placeholder="Chọn bài mở miễn phí (không bắt buộc)"
        optionFilterProp="label"
        optionRender={(option) => renderLessonOption((option.data ?? option) as TreeOption)}
      />
    </Modal>
  );
}

interface PackageCardProps {
  courseId: string;
  pkg?: CoursePackage;
  tree: CourseTreeNode[];
  sectionOptions: TreeOption[];
  lessonOptions: TreeOption[];
  readOnly: boolean;
  /** Chỉ có ở card gói mới: `sortOrder` prefill, chốt lúc admin bấm "Thêm gói". */
  draftSortOrder?: number;
  /** Chỉ có ở card gói mới: gỡ card nháp sau khi POST xong hoặc khi admin bỏ. */
  onDraftClose?: () => void;
}

function PackageCard({
  courseId,
  pkg,
  tree,
  sectionOptions,
  lessonOptions,
  readOnly,
  draftSortOrder,
  onDraftClose,
}: PackageCardProps) {
  const [form] = Form.useForm<PackageFormValues>();
  // Bộ chọn phạm vi: index = dòng đang sửa (undefined = thêm mới).
  const [picker, setPicker] = useState<{ open: boolean; index?: number }>({ open: false });
  const create = useCreateCoursePackage(courseId);
  const update = useUpdateCoursePackage(courseId);
  const archive = useArchiveCoursePackage(courseId);
  const reactivate = useReactivateCoursePackage(courseId);

  // Gói đã ngừng bán: chỉ đọc. PATCH gói ghi đè CẢ mảng entitlement, nên một cú bấm nhầm trên gói
  // ARCHIVED vẫn đổi được quyền của khách đã mua (gói ARCHIVED vẫn cấp quyền cho purchase cũ).
  const archived = isPackageArchived(pkg);
  const writable = !readOnly && !archived;

  useEffect(() => {
    form.setFieldsValue(
      pkg
        ? packageToFormValues(pkg)
        : {
            name: "",
            slug: "",
            sortOrder: draftSortOrder,
            defaultPackage: false,
            entitlements: [],
          }
    );
    // draftSortOrder cố ý KHÔNG nằm trong deps: nó đã được chốt lúc tạo card nháp, thêm vào đây thì
    // mỗi lần danh sách gói refetch sẽ ghi đè lên ô admin đang gõ dở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg, form]);

  const handleSave = () => {
    form.validateFields().then(() => {
      // getFieldsValue(true) chứ KHÔNG dùng values của validateFields: antd chỉ trả về field đã
      // đăng ký Form.Item, mà `raw` (bản gốc entitlement từ BE) không có ô nhập nào. Mất `raw` là
      // mất luôn subset ladder / lessonId / quyền bài tập khi PATCH ghi đè cả mảng entitlement.
      const values = form.getFieldsValue(true) as PackageFormValues;
      const body = buildPackagePayload(values);
      if (pkg) {
        update.mutate(
          { packageId: pkg.id, body },
          { onSuccess: () => message.success("Đã lưu gói") }
        );
      } else {
        create.mutate(body, {
          onSuccess: () => {
            message.success("Đã tạo gói");
            onDraftClose?.();
          },
        });
      }
    });
  };

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <Space>
          <span>{pkg ? pkg.name : "Gói mới"}</span>
          {archived ? <Tag color="default">Ngừng bán</Tag> : pkg && <Tag>{pkg.status}</Tag>}
          {pkg?.defaultPackage && <Tag color="blue">Gói mặc định</Tag>}
        </Space>
      }
    >
      <Form form={form} layout="vertical" disabled={!writable}>
        <Space align="baseline" wrap>
          <Form.Item name="name" label="Tên gói" rules={[{ required: true, message: "Nhập tên gói" }]}>
            <Input placeholder="Gói Premium" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: "Nhập slug" }]}>
            <Input placeholder="premium" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="salePrice" label="Giá bán">
            <InputNumber min={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="originalPrice" label="Giá gốc">
            <InputNumber min={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự">
            <InputNumber min={0} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item name="defaultPackage" label=" " valuePropName="checked">
            <Checkbox>Gói mặc định</Checkbox>
          </Form.Item>
        </Space>

        <Typography.Text strong>Quyền truy cập</Typography.Text>
        <Form.List name="entitlements">
          {(fields, { add, remove }) => (
            <div style={{ marginTop: 8 }}>
              {fields.length === 0 && (
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                  Gói chưa cấp quyền nào — bấm “Thêm quyền” để chọn phần hoặc bài.
                </Typography.Text>
              )}
              {fields.map(({ key, name }) => (
                <Form.Item key={key} noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const row = (getFieldValue(["entitlements", name]) ??
                      {}) as PackageEntitlementFormValues;
                    const summary = entitlementSummary(row, sectionOptions, lessonOptions);
                    return (
                      <Card size="small" style={{ marginBottom: 8 }}>
                        <Space
                          align="start"
                          style={{ width: "100%", justifyContent: "space-between" }}
                        >
                          <Space direction="vertical" size={2}>
                            <Space size={8} wrap>
                              <Tag color={summary.color}>{summary.kind}</Tag>
                              <Typography.Text strong>{summary.title}</Typography.Text>
                              {summary.freeCount > 0 && (
                                <Tag color="cyan">Mở miễn phí: {summary.freeCount} bài</Tag>
                              )}
                            </Space>
                            {summary.detail && (
                              <Typography.Paragraph
                                type="secondary"
                                style={{ fontSize: 12, margin: 0, maxWidth: 620 }}
                                ellipsis={{ rows: 2, tooltip: summary.detail }}
                              >
                                {summary.detail}
                              </Typography.Paragraph>
                            )}
                            {summary.preserved.map((hint) => (
                              <Typography.Text key={hint} type="warning" style={{ fontSize: 12 }}>
                                {hint}
                              </Typography.Text>
                            ))}
                          </Space>
                          {writable && (
                            <Space>
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                disabled={row.type === "EXERCISE"}
                                onClick={() => setPicker({ open: true, index: name })}
                              >
                                Sửa
                              </Button>
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            </Space>
                          )}
                        </Space>
                      </Card>
                    );
                  }}
                </Form.Item>
              ))}
              {writable && (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setPicker({ open: true })}
                >
                  Thêm quyền
                </Button>
              )}
              <EntitlementScopeModal
                open={picker.open}
                tree={tree}
                lessonOptions={lessonOptions}
                editing={
                  picker.index != null
                    ? ((form.getFieldValue(["entitlements", picker.index]) ?? undefined) as
                        | PackageEntitlementFormValues
                        | undefined)
                    : undefined
                }
                onCancel={() => setPicker({ open: false })}
                onSubmit={(rows) => {
                  if (picker.index != null) {
                    // Sửa: một dòng có thể tách thành nhiều dòng (chọn thêm phần khác) → splice.
                    const all = [
                      ...(((form.getFieldValue("entitlements") ?? []) as
                        PackageEntitlementFormValues[]) ?? []),
                    ];
                    all.splice(picker.index, 1, ...rows);
                    form.setFieldValue("entitlements", all);
                  } else {
                    rows.forEach((r) => add(r));
                  }
                  setPicker({ open: false });
                }}
              />
            </div>
          )}
        </Form.List>
      </Form>

      {archived && !readOnly && pkg && (
        <Space style={{ marginTop: 12 }} align="center">
          <Typography.Text type="secondary">
            Gói đã ngừng bán — chỉ đọc. Muốn sửa thì kích hoạt lại trước.
          </Typography.Text>
          <Popconfirm
            title="Kích hoạt lại gói này?"
            description="Gói sẽ bán trở lại với đúng quyền truy cập hiện có (entitlement giữ nguyên)."
            okText="Kích hoạt lại"
            cancelText="Huỷ"
            onConfirm={() =>
              reactivate.mutate(
                { packageId: pkg.id },
                { onSuccess: () => message.success("Đã kích hoạt lại gói") }
              )
            }
          >
            <Button type="primary" loading={reactivate.isPending}>
              Kích hoạt lại
            </Button>
          </Popconfirm>
        </Space>
      )}

      {writable && (
        <Space style={{ marginTop: 12 }}>
          <Button
            type="primary"
            onClick={handleSave}
            loading={create.isPending || update.isPending}
          >
            Lưu gói
          </Button>
          {pkg ? (
            <Popconfirm
              title="Ngừng bán gói này?"
              description="Gói sẽ biến mất khỏi trang bán. Học viên đã mua vẫn giữ nguyên quyền học."
              okText="Ngừng bán"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() =>
                archive.mutate(
                  { packageId: pkg.id },
                  { onSuccess: () => message.success("Đã ngừng bán gói") }
                )
              }
            >
              <Button danger loading={archive.isPending}>
                Ngừng bán
              </Button>
            </Popconfirm>
          ) : (
            <Button onClick={onDraftClose}>Bỏ gói mới</Button>
          )}
        </Space>
      )}
    </Card>
  );
}

export function PricingTab({ course, readOnly }: PricingTabProps) {
  const [form] = Form.useForm<{ basePrice?: number }>();
  const update = useUpdateCoursePricing(course.id);
  const packagesQuery = useCoursePackages(course.id);
  const [drafts, setDrafts] = useState<{ key: number; sortOrder: number }[]>([]);
  const nextDraftKey = useRef(0);

  // KHÔNG mặc định 0: query admin (GraphQL AdminCourseDetail) không trả totalPrice nên
  // course.basePrice là undefined. Prefill 0 rồi bấm "Lưu pricing" sẽ PATCH totalPrice=0, tức xoá
  // trắng giá thật của khoá. Chưa biết giá thì để trống và chặn nút cho tới khi admin tự nhập.
  useEffect(() => {
    form.setFieldsValue({ basePrice: course.basePrice });
  }, [course, form]);

  const priceUnknown = course.basePrice == null;

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (values.basePrice == null) return; // lưới an toàn: không bao giờ PATCH totalPrice rỗng/0 ngoài ý muốn
      update.mutate(
        { basePrice: values.basePrice },
        { onSuccess: () => message.success("Đã cập nhật pricing") }
      );
    });
  };

  const isLegacy = course.saleMode === "LEGACY";
  const packagesReadOnly = isPackageAreaReadOnly(course.saleMode, readOnly);
  const sectionOptions = sectionOptionsFromTree(course.tree);
  const lessonOptions = lessonOptionsFromTree(course.tree);
  const packages = packagesQuery.data ?? [];

  return (
    <div>
      <Typography.Title level={5}>Giá &amp; gói</Typography.Title>
      {priceUnknown && (
        <Alert
          type="warning"
          message="Console admin chưa đọc được giá hiện tại của khoá"
          description="API admin không trả về giá nên ô dưới đang trống. Chỉ nhập khi bạn muốn GHI ĐÈ giá đang bán — bỏ trống thì không có request nào được gửi."
          style={{ marginBottom: 12 }}
          showIcon
        />
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="basePrice"
          label="Giá gốc"
          rules={[{ required: true, message: "Nhập giá gốc" }]}
        >
          <InputNumber
            disabled={readOnly}
            style={{ width: 200 }}
            min={0}
            placeholder="Chưa biết giá"
            formatter={(v) => (v == null ? "" : `${v}đ`)}
          />
        </Form.Item>
        {!readOnly && (
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => (
              <Button
                type="primary"
                onClick={handleSave}
                loading={update.isPending}
                disabled={getFieldValue("basePrice") == null}
              >
                Lưu pricing
              </Button>
            )}
          </Form.Item>
        )}
      </Form>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Gói học tập
      </Typography.Title>
      {isLegacy && (
        <Alert
          type="info"
          message="Khoá học LEGACY chưa bán theo gói"
          description="Đổi Loại khoá học sang PACKAGE ở tab Tổng quan để quản lý gói. Khu vực gói đang ở chế độ chỉ đọc."
          style={{ marginBottom: 12 }}
          showIcon
        />
      )}
      {course.tree.length === 0 && !isLegacy && (
        <Alert
          type="warning"
          message="Khoá chưa có nội dung"
          description="Thêm phần và bài học ở tab Nội dung trước, rồi mới chọn được quyền truy cập cho gói."
          style={{ marginBottom: 12 }}
          showIcon
        />
      )}

      {packagesQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          {packages.length === 0 && drafts.length === 0 && (
            <Empty description="Khoá chưa có gói nào" />
          )}
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              courseId={course.id}
              pkg={pkg}
              tree={course.tree}
              sectionOptions={sectionOptions}
              lessonOptions={lessonOptions}
              readOnly={packagesReadOnly}
            />
          ))}
          {drafts.map((draft) => (
            <PackageCard
              key={`draft-${draft.key}`}
              courseId={course.id}
              tree={course.tree}
              sectionOptions={sectionOptions}
              lessonOptions={lessonOptions}
              readOnly={packagesReadOnly}
              draftSortOrder={draft.sortOrder}
              onDraftClose={() => setDrafts((list) => list.filter((d) => d.key !== draft.key))}
            />
          ))}
        </>
      )}

      {!packagesReadOnly && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={() =>
            setDrafts((list) => [
              ...list,
              {
                key: nextDraftKey.current++,
                // Cộng dồn cả card nháp đang mở, nếu không mở 2 card liền nhau là 2 gói cùng số.
                sortOrder: Math.max(
                  nextPackageSortOrder(packages),
                  ...list.map((d) => d.sortOrder + 1)
                ),
              },
            ])
          }
        >
          Thêm gói
        </Button>
      )}
    </div>
  );
}
