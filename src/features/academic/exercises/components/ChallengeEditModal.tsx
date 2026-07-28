import { useEffect } from "react";
import { Alert, Form, Input, Modal, Switch, Typography, message } from "antd";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useUpdateChallenge } from "../api/exercises.api";
import type { ChallengeView, UpdateChallengeRequest } from "../types";

/** Giá trị form Sửa challenge (chỉ meta cơ bản + cờ học thử). */
export interface ChallengeEditFormValues {
  title: string;
  description?: string;
  /** challenge-free-flag: "Cho làm miễn phí (học thử)". */
  free: boolean;
}

/**
 * Diff form → PATCH partial (admin-challenge-edit): CHỈ đính field ĐỔI so với giá trị hiện tại của
 * challenge (BE update: null → giữ nguyên). Nhờ so-sánh-đổi này, kể cả khi một field pre-fill thiếu
 * cũng KHÔNG ghi đè: chỉ gửi khi người dùng thực sự đổi.
 * - title: bỏ khoảng trắng thừa; chỉ gửi khi khác & không rỗng (title bắt buộc, tránh xoá trắng).
 * - description: chuẩn hoá null/undefined/"" → "" khi so sánh; gửi "" nếu người dùng xoá mô tả.
 * - free: gửi khi boolean khác cờ hiện tại (original.free absent ⇒ coi như false).
 * Trả {} nếu không có gì đổi (caller khỏi bắn request).
 */
export function buildUpdateChallengePayload(
  original: Pick<ChallengeView, "title" | "description" | "free">,
  values: ChallengeEditFormValues
): UpdateChallengeRequest {
  const patch: UpdateChallengeRequest = {};

  const nextTitle = (values.title ?? "").trim();
  if (nextTitle && nextTitle !== original.title) {
    patch.title = nextTitle;
  }

  const nextDesc = (values.description ?? "").trim();
  const origDesc = (original.description ?? "").trim();
  if (nextDesc !== origDesc) {
    patch.description = nextDesc;
  }

  const origFree = original.free ?? false;
  if (values.free !== origFree) {
    patch.free = values.free;
  }

  return patch;
}

interface ChallengeEditModalProps {
  open: boolean;
  /** Challenge đang sửa (nguồn pre-fill: title/description/free THẬT từ GET /challenges). */
  challenge: ChallengeView | null;
  disabled?: boolean;
  onClose: () => void;
  /** Gọi sau khi lưu thành công (caller refetch danh sách để cờ/meta cập nhật ngay). */
  onSaved?: () => void;
}

/**
 * Sửa 1 challenge per-lesson (admin-challenge-edit): pre-fill title/description/cờ học thử từ hàng
 * hiện tại rồi PATCH /admin/challenges/{id} theo partial-diff. Chủ đích chính: sửa cờ `free` khi tạo
 * nhầm (đánh dấu học thử sai) mà không phải xoá & tạo lại. KHÔNG sửa nội dung (mcq/test-case/rubric)
 * — để riêng (follow-up). KHÔNG đụng luồng tạo (ChallengeWizardDrawer).
 */
export function ChallengeEditModal({
  open,
  challenge,
  disabled,
  onClose,
  onSaved,
}: ChallengeEditModalProps) {
  const [form] = Form.useForm<ChallengeEditFormValues>();
  const update = useUpdateChallenge();

  // Pre-fill từ GIÁ TRỊ HIỆN TẠI của challenge mỗi lần mở (free THẬT từ ChallengeView.free — không
  // hardcode default kẻo lưu đè). free absent (response cũ đã cache) → coi như false.
  useEffect(() => {
    if (open && challenge) {
      form.setFieldsValue({
        title: challenge.title,
        description: challenge.description ?? "",
        free: challenge.free ?? false,
      });
    }
  }, [open, challenge, form]);

  const handleFinish = (values: ChallengeEditFormValues) => {
    if (!challenge) return;
    const patch = buildUpdateChallengePayload(challenge, values);
    if (Object.keys(patch).length === 0) {
      message.info("Chưa có thay đổi nào để lưu");
      onClose();
      return;
    }
    update.mutate(
      { id: challenge.id, body: patch },
      {
        onSuccess: () => {
          message.success("Đã cập nhật thử thách");
          onSaved?.();
          onClose();
        },
        onError: handleAdminMutationError,
      }
    );
  };

  return (
    <Modal
      title="Sửa thử thách"
      open={open}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Huỷ"
      okButtonProps={{ loading: update.isPending, disabled }}
      confirmLoading={update.isPending}
      onCancel={onClose}
      destroyOnClose
    >
      {disabled && (
        <Alert
          type="warning"
          message="Chế độ chỉ đọc — không có quyền sửa thử thách."
          style={{ marginBottom: 16 }}
        />
      )}
      <Form form={form} layout="vertical" onFinish={handleFinish} disabled={disabled}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: "Nhập tiêu đề" }]}>
          <Input placeholder="Tiêu đề thử thách" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Mô tả ngắn (có thể để trống)" />
        </Form.Item>
        <Form.Item
          name="free"
          label="Cho làm miễn phí (học thử)"
          valuePropName="checked"
          tooltip="Học viên học thử / chưa mua vẫn làm được thử thách này khi bài học đang mở (miễn phí/trial)."
        >
          <Switch />
        </Form.Item>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Sửa nội dung (câu hỏi / test case / rubric) và loại thử thách không nằm ở đây — dùng khi cần
          chỉnh nhanh tiêu đề, mô tả hoặc cờ học thử.
        </Typography.Text>
      </Form>
    </Modal>
  );
}
