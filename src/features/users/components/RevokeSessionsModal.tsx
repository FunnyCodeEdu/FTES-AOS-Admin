import { Modal, Typography, message } from "antd";
import { ApiError } from "../../../shared/api/client";
import { useRevokeSessions, useRefreshMeOnForbidden } from "../api/users.api";

interface RevokeSessionsModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  selectedSessionIds: string[];
  onSuccess: () => void;
}

export function RevokeSessionsModal({
  userId,
  open,
  onClose,
  selectedSessionIds,
  onSuccess,
}: RevokeSessionsModalProps) {
  const revoke = useRevokeSessions(userId);
  const refreshMe = useRefreshMeOnForbidden();
  const isAll = selectedSessionIds.length === 0;

  const handleOk = () => {
    const payload = isAll ? "all" : { sessionIds: selectedSessionIds };
    revoke.mutate(payload, {
      onSuccess: (data) => {
        message.success(`Đã thu hồi ${data.revokedCount} session`);
        onSuccess();
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
      title="Thu hồi session"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={revoke.isPending}
      okText="Thu hồi"
      okButtonProps={{ danger: true }}
    >
      <Typography.Paragraph type="danger">
        {isAll
          ? "Tất cả session của user sẽ bị thu hồi. User phải đăng nhập lại trên mọi thiết bị."
          : `${selectedSessionIds.length} session được chọn sẽ bị thu hồi.`}
      </Typography.Paragraph>
    </Modal>
  );
}
