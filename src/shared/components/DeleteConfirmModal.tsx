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
  /**
   * Chữ trên nút xác nhận. Mặc định "Xoá" — giữ nguyên mọi call site cũ.
   *
   * Có prop này để tái dùng modal cho các thao tác NGUY HIỂM KHÁC mà không phải chế modal mới:
   * thứ modal này thật sự cung cấp là "chặn một hành động không hoàn tác được + bắt nhập lý do đi
   * vào audit", còn "xoá" chỉ là ca đầu tiên cần nó. Ca thứ hai: BẬT sự kiện nhân hệ số XP —
   * XP đã cấp nằm vĩnh viễn trong sổ, tắt sự kiện KHÔNG rút lại được.
   */
  okText?: string;
  /** Nhãn ô lý do. Mặc định "Lý do xoá (ghi audit log)". */
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Modal xác nhận thao tác NGUY HIỂM, KHÔNG HOÀN TÁC ĐƯỢC, có ô nhập LÝ DO (audit). Dùng cho mọi
 * hành động mà BE gác `requireReason` (xoá khoá học/challenge, bật sự kiện nhân hệ số XP, …). Khác
 * `Modal.confirm` yes/no thường: bắt buộc lý do + gửi lý do lên BE. Nút xác nhận màu danger +
 * loading.
 */
export function DeleteConfirmModal({
  open,
  title,
  description,
  requireReason = true,
  loading,
  okText = "Xoá",
  reasonLabel = "Lý do xoá (ghi audit log)",
  reasonPlaceholder = "VD: tạo nhầm, trùng, nội dung sai…",
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const [form] = Form.useForm<{ reason: string }>();
  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
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
          label={reasonLabel}
          rules={requireReason ? [{ required: true, message: "Nhập lý do để ghi audit log" }] : []}
        >
          <Input.TextArea rows={3} placeholder={reasonPlaceholder} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
