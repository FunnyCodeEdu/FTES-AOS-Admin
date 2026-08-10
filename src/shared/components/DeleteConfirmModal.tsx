import type { ReactNode } from "react";
import { Alert, Form, Input, Modal } from "antd";

interface DeleteConfirmModalProps {
  open: boolean;
  title: string;
  /** Cảnh báo hậu quả (hiện trong Alert) — nên nêu rõ "không hoàn tác được". */
  description?: ReactNode;
  /**
   * Bắt buộc nhập lý do (ghi audit). Mặc định true — các endpoint xoá nguy hiểm của BE
   * (khoá học / challenge / môn / học liệu) yêu cầu `reason`, thiếu → 400 ADMIN_REASON_REQUIRED.
   */
  requireReason?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Modal xác nhận xoá NGUY HIỂM có ô nhập LÝ DO (audit). Dùng cho mọi hành động xoá mà BE gác
 * `requireReason` (khoá học, challenge, …). Khác `Modal.confirm` yes/no thường: bắt buộc lý do +
 * gửi kèm vào body DELETE `{ data: { reason } }`. Nút Xoá màu danger + loading.
 */
export function DeleteConfirmModal({
  open,
  title,
  description,
  requireReason = true,
  loading,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const [form] = Form.useForm<{ reason: string }>();
  return (
    <Modal
      open={open}
      title={title}
      okText="Xoá"
      okType="danger"
      okButtonProps={{ danger: true, loading }}
      cancelText="Huỷ"
      confirmLoading={loading}
      onOk={() => form.validateFields().then((v) => onConfirm((v.reason ?? "").trim()))}
      onCancel={onCancel}
      afterClose={() => form.resetFields()}
      destroyOnClose
    >
      {description ? (
        <Alert type="warning" showIcon message={description} style={{ marginBottom: 16 }} />
      ) : null}
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label="Lý do xoá (ghi audit log)"
          rules={requireReason ? [{ required: true, message: "Nhập lý do để ghi audit log" }] : []}
        >
          <Input.TextArea rows={3} placeholder="VD: tạo nhầm, trùng, nội dung sai…" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
