import { Checkbox, Form, Modal, Typography, message } from "antd";
import { ApiError } from "../../../shared/api/client";
import { useForceResetPassword, useRefreshMeOnForbidden } from "../api/users.api";

interface ResetPasswordModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function ResetPasswordModal({ userId, open, onClose }: ResetPasswordModalProps) {
  const [form] = Form.useForm<{ notifyUser: boolean }>();
  const reset = useForceResetPassword(userId);
  const refreshMe = useRefreshMeOnForbidden();

  const handleOk = () => {
    const values = form.getFieldsValue();
    reset.mutate(values, {
      onSuccess: (data) => {
        message.success(`Đã phát hành yêu cầu reset mật khẩu lúc ${new Date(data.resetIssuedAt).toLocaleString("vi-VN")}`);
        onClose();
      },
      onError: (err: Error) => {
        const code = err instanceof ApiError ? err.code : undefined;
        if (code === 403) {
          message.error("Bạn không còn quyền thực hiện thao tác này");
          refreshMe();
        } else {
          message.error(err.message || "Thao tác thất bại");
        }
      },
    });
  };

  return (
    <Modal
      title="Force reset mật khẩu"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={reset.isPending}
      okText="Reset mật khẩu"
      okButtonProps={{ danger: true }}
    >
      <Typography.Paragraph type="danger">
        Mật khẩu hiện tại của user sẽ bị vô hiệu hoá. User phải thực hiện flow đặt lại mật khẩu
        trước khi đăng nhập lại.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" initialValues={{ notifyUser: true }}>
        <Form.Item name="notifyUser" valuePropName="checked">
          <Checkbox>Gửi email thông báo cho user</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
