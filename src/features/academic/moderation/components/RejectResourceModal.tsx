import { Alert, Form, Input, Modal, Typography } from "antd";

interface RejectResourceModalProps {
  open: boolean;
  /** Tiêu đề mục đang từ chối — hiện trong câu xác nhận để không từ chối nhầm dòng. */
  title?: string;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

/**
 * Modal từ chối học liệu. Lý do là BẮT BUỘC ở cả ba lớp:
 *
 *  1. `rules` có `required` **+ `whitespace: true`** — thiếu `whitespace` thì chuỗi `"   "` vẫn
 *     lọt qua `required` của AntD và ta gửi lên một lý do rỗng trá hình.
 *  2. Nút OK `disabled` khi `reason.trim()` rỗng (theo dõi realtime bằng `Form.useWatch`) — người
 *     dùng không bấm gửi được, thay vì bấm rồi mới nhận lỗi đỏ.
 *  3. `validateFields()` chạy trước khi gọi `onSubmit`, và `reason` được `trim()` khi gửi.
 *
 * Chốt cuối vẫn là BE (`helper.requireReason` → 400 `ADMIN_REASON_REQUIRED`), nhưng UI không được
 * để request đó bao giờ rời máy.
 */
export function RejectResourceModal({
  open,
  title,
  confirmLoading,
  onCancel,
  onSubmit,
}: RejectResourceModalProps) {
  const [form] = Form.useForm<{ reason: string }>();
  const reason = Form.useWatch("reason", form);
  const canSubmit = Boolean(reason?.trim());

  const handleOk = () => {
    form.validateFields().then((values) => onSubmit(values.reason.trim()));
  };

  return (
    <Modal
      title="Từ chối học liệu"
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
        Từ chối <strong>{title ?? "học liệu này"}</strong>. Học liệu sẽ chuyển sang trạng thái
        REJECTED và biến khỏi hàng đợi.
      </Typography.Paragraph>
      <Alert
        type="info"
        showIcon
        message="Lý do bắt buộc — người đóng góp đọc được lý do này để sửa và gửi lại."
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
            placeholder="Ví dụ: ảnh đề mờ không đọc được câu 12-18, vui lòng chụp lại rồi gửi lại."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
