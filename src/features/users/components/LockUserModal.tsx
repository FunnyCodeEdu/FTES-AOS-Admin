import { Form, Input, Modal, Typography, message } from "antd";
import { ApiError } from "../../../shared/api/client";
import { useLockUser, useUnlockUser, useRefreshMeOnForbidden } from "../api/users.api";
import type { UserProfile } from "../types";

interface LockUserModalProps {
  user: UserProfile;
  open: boolean;
  onClose: () => void;
}

export function LockUserModal({ user, open, onClose }: LockUserModalProps) {
  const [form] = Form.useForm<{ reason: string }>();
  const lock = useLockUser(user.id);
  const unlock = useUnlockUser(user.id);
  const refreshMe = useRefreshMeOnForbidden();
  const isLocked = user.status === "locked";
  const mutation = isLocked ? unlock : lock;

  const handleOk = () => {
    form.validateFields().then(({ reason }) => {
      mutation.mutate(
        { reason },
        {
          onSuccess: () => {
            message.success(isLocked ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản");
            form.resetFields();
            onClose();
          },
          onError: (err: Error) => {
            const code = err instanceof ApiError ? err.code : undefined;
            if (code === 403) {
              message.error("Bạn không còn quyền thực hiện thao tác này");
              refreshMe();
            } else if (code === 409) {
              message.error("Trạng thái tài khoản đã thay đổi, đang tải lại…");
              refreshMe();
            } else {
              message.error(err.message || "Thao tác thất bại");
            }
          },
        }
      );
    });
  };

  return (
    <Modal
      title={isLocked ? "Mở khoá tài khoản" : "Khoá tài khoản"}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={mutation.isPending}
      okText={isLocked ? "Mở khoá" : "Khoá"}
      okButtonProps={{ danger: !isLocked }}
    >
      <Typography.Paragraph type={isLocked ? undefined : "danger"}>
        {isLocked
          ? "Tài khoản sẽ được mở khoá và user có thể đăng nhập lại bình thường."
          : "User bị đăng xuất mọi thiết bị và không đăng nhập được cho tới khi được mở khoá."}
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item
          label="Lý do"
          name="reason"
          rules={[
            { required: true, message: "Vui lòng nhập lý do" },
            { min: 10, message: "Lý do phải có ít nhất 10 ký tự" },
          ]}
        >
          <Input.TextArea rows={3} autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}
