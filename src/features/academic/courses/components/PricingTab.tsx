import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { CourseDetail, CoursePackage, CourseTreeNode, CourseType } from "../../types";
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
      options.push({ value: child.id, label: `${section.title} / ${child.title}` });
    }
  }
  return options;
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

interface PackageCardProps {
  courseId: string;
  pkg?: CoursePackage;
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
  sectionOptions,
  lessonOptions,
  readOnly,
  draftSortOrder,
  onDraftClose,
}: PackageCardProps) {
  const [form] = Form.useForm<PackageFormValues>();
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

        <Typography.Text strong>Quyền truy cập (entitlement)</Typography.Text>
        <Form.List name="entitlements">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card key={key} size="small" style={{ marginTop: 8 }}>
                  <Space align="baseline" wrap>
                    <Form.Item
                      {...restField}
                      name={[name, "type"]}
                      label="Loại"
                      rules={[{ required: true, message: "Chọn loại" }]}
                    >
                      <Select
                        style={{ width: 140 }}
                        options={[
                          { value: "COURSE", label: "Trọn khoá" },
                          { value: "PART", label: "Trọn phần" },
                          { value: "LESSON", label: "Chọn bài" },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate>
                      {({ getFieldValue }) => {
                        const row = (getFieldValue(["entitlements", name]) ??
                          {}) as PackageEntitlementFormValues;
                        const type = row.type;
                        if (type === "EXERCISE") {
                          return (
                            <Typography.Text type="secondary">
                              Entitlement bài tập — editor chưa hỗ trợ sửa, lưu gói sẽ giữ nguyên.
                            </Typography.Text>
                          );
                        }
                        if (type === "COURSE") {
                          // Trọn khoá: KHÔNG có ô phạm vi (BE từ chối sectionId/lessonId/selected*).
                          // Đây là loại của gói mặc định `full`; hiện ô "Phần" bắt buộc như trước sẽ
                          // chặn admin lưu gói, hoặc tệ hơn là ép dòng này về LESSON rỗng khi lưu.
                          return (
                            <Typography.Text type="secondary">
                              Cấp TRỌN khoá, kể cả phần/bài thêm sau — không cần chọn phạm vi.
                            </Typography.Text>
                          );
                        }
                        const hints = preservedScopeHints(row, lessonOptions);
                        const scopeField =
                          type === "LESSON" ? (
                            <Form.Item
                              {...restField}
                              name={[name, "selectedLessonIds"]}
                              label="Bài học"
                              rules={[{ required: true, message: "Chọn ít nhất 1 bài" }]}
                            >
                              <Select
                                mode="multiple"
                                style={{ minWidth: 320 }}
                                options={lessonOptions}
                                placeholder="Chọn bài"
                              />
                            </Form.Item>
                          ) : (
                            <Form.Item
                              {...restField}
                              name={[name, "sectionId"]}
                              label="Phần"
                              rules={[{ required: true, message: "Chọn phần" }]}
                            >
                              <Select
                                style={{ minWidth: 260 }}
                                options={sectionOptions}
                                placeholder="Chọn phần"
                              />
                            </Form.Item>
                          );
                        if (hints.length === 0) return scopeField;
                        return (
                          <Space direction="vertical" size={4}>
                            {scopeField}
                            {hints.map((hint) => (
                              <Typography.Text key={hint} type="warning" style={{ fontSize: 12 }}>
                                {hint}
                              </Typography.Text>
                            ))}
                          </Space>
                        );
                      }}
                    </Form.Item>
                    <Form.Item {...restField} name={[name, "freeLessonIds"]} label="Học thử miễn phí">
                      <Select
                        mode="multiple"
                        style={{ minWidth: 260 }}
                        options={lessonOptions}
                        placeholder="Chọn bài học thử"
                      />
                    </Form.Item>
                    {writable && <MinusCircleOutlined onClick={() => remove(name)} />}
                  </Space>
                </Card>
              ))}
              {writable && (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                  onClick={() => add({ type: "PART", selectedLessonIds: [], freeLessonIds: [] })}
                >
                  Thêm entitlement
                </Button>
              )}
            </>
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
              sectionOptions={sectionOptions}
              lessonOptions={lessonOptions}
              readOnly={packagesReadOnly}
            />
          ))}
          {drafts.map((draft) => (
            <PackageCard
              key={`draft-${draft.key}`}
              courseId={course.id}
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
