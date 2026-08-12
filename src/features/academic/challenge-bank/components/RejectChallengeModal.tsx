import { Alert, Form, Input, Modal, Typography } from "antd";

interface RejectChallengeModalProps {
  open: boolean;
  /** Tiêu đề mục đang từ chối — hiện trong câu xác nhận để không từ chối nhầm dòng. */
  title?: string;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

/**
 * Từ chối một thử thách chờ duyệt. Lý do là BẮT BUỘC ở cả ba lớp (mirror `RejectResourceModal`):
 *
 *  1. `rules` có `required` **+ `whitespace: true`** — thiếu `whitespace` thì `"   "` vẫn lọt qua
 *     `required` của AntD và ta gửi lên một lý do rỗng trá hình.
 *  2. Nút OK `disabled` khi `reason.trim()` rỗng (theo dõi realtime bằng `Form.useWatch`).
 *  3. `validateFields()` chạy trước `onSubmit`, và `reason` được `trim()` khi gửi.
 *
 * Chốt cuối vẫn là BE (blank ⇒ 400 `ADMIN_REASON_REQUIRED`), nhưng UI không được để request đó rời
 * máy — người soạn đề đọc chính lý do này để sửa và gửi lại.
 */
export function RejectChallengeModal({
  open,
  title,
  confirmLoading,
  onCancel,
  onSubmit,
}: RejectChallengeModalProps) {
  const [form] = Form.useForm<{ reason: string }>();
  const reason = Form.useWatch("reason", form);
  const canSubmit = Boolean(reason?.trim());

  const handleOk = () => {
    form.validateFields().then((values) => onSubmit(values.reason.trim()));
  };

  return (
    <Modal
      title="Từ chối thử thách"
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="Từ chối"
      cancelText="Huỷ"
      okButtonProps={{ danger: true, disabled: !canSubmit }}
      destroyOnClose
      afterClose={() => form.resetFields()}
    >
      <Typography.Paragraph>
        Từ chối <strong>{title ?? "thử thách này"}</strong>. Mục sẽ rời hàng đợi và người soạn nhận
        được lý do bên dưới.
      </Typography.Paragraph>
      <Alert
        type="info"
        showIcon
        message="Lý do bắt buộc — người soạn đề đọc lý do này để sửa và gửi lại."
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="reason"
          label="Lý do từ chối"
          rules={[
            { required: true, whitespace: true, message: "Vui lòng nhập lý do từ chối" },
            { min: 5, message: "Lý do phải có ít nhất 5 ký tự" },
          ]}
        >
          <Input.TextArea
            rows={4}
            autoFocus
            maxLength={5000}
            showCount
            placeholder="Ví dụ: đề thiếu câu 7-10, và tệp đề bị mờ không đọc được phần code mẫu."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
