import { useEffect } from "react";
import {
  Alert,
  Avatar,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";
import { willHaveLinkedUser } from "../payload";
import {
  GOLDEN_BOARD_LIMITS,
  MAX_ACHIEVEMENT_LINES,
  type GoldenBoardEntry,
  type GoldenBoardEntryFormValues,
} from "../types";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface GoldenBoardEntryFormModalProps {
  open: boolean;
  entry?: GoldenBoardEntry | null;
  termLabel?: string;
  onClose: () => void;
  onSubmit: (values: GoldenBoardEntryFormValues) => void;
  isSubmitting?: boolean;
  /** Truyền từ trang để 409 (GOLDEN_BOARD_DUPLICATE_USER) hiển thị lỗi trên đúng field `userId`. */
  form: FormInstance<GoldenBoardEntryFormValues>;
}

export function GoldenBoardEntryFormModal({
  open,
  entry,
  termLabel,
  onClose,
  onSubmit,
  isSubmitting,
  form,
}: GoldenBoardEntryFormModalProps) {
  const isEdit = Boolean(entry);

  useEffect(() => {
    if (!open) return;
    // Bind vào field RAW đã lưu, KHÔNG phải giá trị đã resolve (linkedDisplayName/linkedAvatarUrl):
    // mở một dòng chỉ gắn tài khoản (displayName để trống, cố ý lấy tên từ profile) rồi bấm Lưu
    // phải giữ nguyên ô trống, chứ không được đóng đinh tên profile vào dòng.
    form.setFieldsValue(
      entry
        ? {
            rank: entry.rank,
            userId: entry.userId ?? "",
            unlinkUser: false,
            displayName: entry.displayName ?? "",
            photoUrl: entry.photoUrl ?? "",
            headline: entry.headline ?? "",
            badgeLabel: entry.badgeLabel ?? "",
            lines: entry.lines.length > 0 ? [...entry.lines] : [],
            active: entry.active,
          }
        : {
            rank: 0,
            userId: "",
            unlinkUser: false,
            displayName: "",
            photoUrl: "",
            headline: "",
            badgeLabel: "",
            lines: [],
            active: true,
          }
    );
  }, [open, entry, form]);

  return (
    <Modal
      title={isEdit ? "Sửa dòng bảng vàng" : "Thêm dòng bảng vàng"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText={isEdit ? "Lưu" : "Thêm"}
      cancelText="Huỷ"
      width={640}
    >
      {termLabel && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Kỳ: <strong>{termLabel}</strong>
        </Typography.Paragraph>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => onSubmit(values as GoldenBoardEntryFormValues)}
      >
        <Form.Item
          name="rank"
          label="Hạng"
          tooltip="Khoá sắp xếp trên bảng (nhỏ đứng trước). Hạng trùng nhau vẫn hợp lệ."
        >
          <InputNumber
            min={GOLDEN_BOARD_LIMITS.rankMin}
            max={GOLDEN_BOARD_LIMITS.rankMax}
            style={{ width: "100%" }}
          />
        </Form.Item>

        {/* ---------------------------------------------------------- liên kết tài khoản */}
        {isEdit && entry?.userId && (
          <Alert
            type="info"
            style={{ marginBottom: 16 }}
            message={
              <Space>
                <Avatar src={entry.linkedAvatarUrl ?? undefined} size="small">
                  {(entry.linkedDisplayName ?? entry.linkedUsername ?? "?")
                    .charAt(0)
                    .toUpperCase()}
                </Avatar>
                <span>
                  Đang gắn tài khoản{" "}
                  <strong>
                    {entry.linkedUsername ? `@${entry.linkedUsername}` : entry.userId}
                  </strong>
                  {entry.linkedDisplayName ? ` — ${entry.linkedDisplayName}` : ""}
                </span>
              </Space>
            }
            description="Xoá trắng ô ID bên dưới KHÔNG gỡ liên kết (server hiểu là giữ nguyên). Muốn gỡ thì bật công tắc “Gỡ liên kết tài khoản”."
          />
        )}

        {isEdit && entry?.userId && (
          <Form.Item
            name="unlinkUser"
            label="Gỡ liên kết tài khoản"
            valuePropName="checked"
            tooltip="Gỡ xong dòng vẫn ở lại bảng nhưng thành người ngoài nền tảng — khi đó bắt buộc phải có tên hiển thị."
          >
            <Switch />
          </Form.Item>
        )}

        <Form.Item noStyle shouldUpdate={(prev, next) => prev.unlinkUser !== next.unlinkUser}>
          {({ getFieldValue }) => {
            const unlinking = Boolean(getFieldValue("unlinkUser")) && Boolean(entry?.userId);
            return (
              <Form.Item
                name="userId"
                label="ID tài khoản (tuỳ chọn)"
                extra={
                  unlinking
                    ? "Đang gỡ liên kết — ô này bị bỏ qua khi lưu."
                    : "Để trống nếu là người ngoài nền tảng (cựu sinh viên, khách mời). Mỗi tài khoản chỉ được xuất hiện MỘT lần trong một kỳ."
                }
                rules={[
                  {
                    validator: (_, value: string | undefined) => {
                      const v = (value ?? "").trim();
                      if (!v || UUID_RE.test(v)) return Promise.resolve();
                      return Promise.reject(
                        new Error("ID tài khoản phải là UUID (vd 3f1c…-…-…-…-…)")
                      );
                    },
                  },
                ]}
              >
                <Input placeholder="UUID của tài khoản" allowClear disabled={unlinking} />
              </Form.Item>
            );
          }}
        </Form.Item>

        {/* ---------------------------------------------------------- nội dung hiển thị */}
        <Form.Item
          name="displayName"
          label="Tên hiển thị"
          dependencies={["userId", "unlinkUser"]}
          extra="Bỏ trống khi đã gắn tài khoản = lấy tên từ profile. Có nhập thì giá trị này THẮNG."
          rules={[
            {
              max: GOLDEN_BOARD_LIMITS.displayName,
              message: `Tối đa ${GOLDEN_BOARD_LIMITS.displayName} ký tự`,
            },
            ({ getFieldValue }) => ({
              // Soi gương CHECK ck_golden_board_identity + requireRenderable của BE: không có tài
              // khoản thì phải có tên, nếu không dòng chẳng render nổi gì. Bắt ở client để admin
              // thấy lỗi ngay trên ô, thay vì nhận một cú 400 sau khi bấm Lưu.
              validator: (_, value: string | undefined) => {
                if ((value ?? "").trim()) return Promise.resolve();
                const hasUser = willHaveLinkedUser(
                  {
                    userId: getFieldValue("userId") as string | undefined,
                    unlinkUser: getFieldValue("unlinkUser") as boolean | undefined,
                  },
                  entry ?? null
                );
                return hasUser
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error("Dòng không gắn tài khoản thì bắt buộc có tên hiển thị")
                    );
              },
            }),
          ]}
        >
          <Input placeholder="VD: Nguyễn Văn A" />
        </Form.Item>

        <Form.Item
          name="photoUrl"
          label="Ảnh chân dung (URL)"
          extra="Bỏ trống khi đã gắn tài khoản = lấy avatar từ profile."
          rules={[
            {
              max: GOLDEN_BOARD_LIMITS.photoUrl,
              message: `Tối đa ${GOLDEN_BOARD_LIMITS.photoUrl} ký tự`,
            },
          ]}
        >
          <Input placeholder="https://…" />
        </Form.Item>

        <Form.Item
          name="headline"
          label="Dòng giới thiệu"
          rules={[
            {
              max: GOLDEN_BOARD_LIMITS.headline,
              message: `Tối đa ${GOLDEN_BOARD_LIMITS.headline} ký tự`,
            },
          ]}
        >
          <Input placeholder="VD: TOP 100 · 3 kỳ" />
        </Form.Item>

        <Form.Item
          name="badgeLabel"
          label="Chip"
          rules={[
            {
              max: GOLDEN_BOARD_LIMITS.badgeLabel,
              message: `Tối đa ${GOLDEN_BOARD_LIMITS.badgeLabel} ký tự`,
            },
          ]}
        >
          <Input placeholder="VD: GPA 9.6" />
        </Form.Item>

        {/* -------------------------------------------------- dòng thành tích (tối đa 3) */}
        <Form.Item
          label={`Dòng thành tích (tối đa ${MAX_ACHIEVEMENT_LINES})`}
          tooltip="DB chỉ nhận tối đa 3 dòng; dòng để trống sẽ bị bỏ khi lưu."
          style={{ marginBottom: 8 }}
        >
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 8 }}>
                    <Form.Item
                      {...restField}
                      name={name}
                      style={{ marginBottom: 0, width: 480 }}
                      rules={[
                        {
                          max: GOLDEN_BOARD_LIMITS.line,
                          message: `Tối đa ${GOLDEN_BOARD_LIMITS.line} ký tự`,
                        },
                      ]}
                    >
                      <Input placeholder={`Thành tích ${name + 1}`} />
                    </Form.Item>
                    <Button
                      icon={<DeleteOutlined />}
                      size="small"
                      danger
                      onClick={() => remove(name)}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add("")}
                  disabled={fields.length >= MAX_ACHIEVEMENT_LINES}
                  block
                >
                  {fields.length >= MAX_ACHIEVEMENT_LINES
                    ? `Đã đạt trần ${MAX_ACHIEVEMENT_LINES} dòng`
                    : "Thêm dòng thành tích"}
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item
          name="active"
          label="Hiện trên bảng"
          valuePropName="checked"
          tooltip="Tắt để gỡ khỏi trang chủ mà vẫn giữ nguyên dữ liệu đã soạn."
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
