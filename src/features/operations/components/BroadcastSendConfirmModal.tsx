import { useState } from "react";
import { Alert, Form, Input, Modal, Space, Typography } from "antd";
import type { BroadcastChannel } from "../shared/types";

interface BroadcastSendConfirmModalProps {
  open: boolean;
  title: string;
  recipientCount: number;
  channels: BroadcastChannel[];
  /** Bật khi segment là "tất cả người dùng" — hiện cảnh báo mạnh hơn ở bước cuối. */
  allUsers?: boolean;
  /** Link đích sẽ gắn vào thông báo; hiện ra để admin soi lại trước khi bấm. */
  deepLink?: string;
  scheduleAt?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLoading?: boolean;
}

export function BroadcastSendConfirmModal({
  open,
  title,
  recipientCount,
  channels,
  allUsers,
  deepLink,
  scheduleAt,
  onClose,
  onConfirm,
  confirmLoading,
}: BroadcastSendConfirmModalProps) {
  const [typedCount, setTypedCount] = useState("");
  const requiresRetype = recipientCount > 1000;
  const typedOk = !requiresRetype || typedCount === String(recipientCount);

  return (
    <Modal
      open={open}
      title="Xác nhận gửi broadcast"
      onCancel={onClose}
      onOk={onConfirm}
      confirmLoading={confirmLoading}
      okText="Gửi"
      cancelText="Huỷ"
      okButtonProps={{ danger: true, disabled: !typedOk }}
      afterClose={() => setTypedCount("")}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Alert
          type={allUsers ? "error" : "warning"}
          message="Không thể thu hồi sau khi gửi"
          description={
            scheduleAt
              ? "Broadcast sẽ được gửi vào thời điểm đã hẹn. Huỷ được khi còn ở trạng thái scheduled."
              : "Broadcast sẽ được gửi ngay lập tức đến danh sách đã chọn."
          }
        />
        {allUsers ? (
          <Alert
            type="error"
            showIcon
            message="Đang gửi cho TẤT CẢ người dùng"
            description="Mọi tài khoản đang hoạt động sẽ nhận thông báo này, không loại trừ ai."
          />
        ) : null}
        <Typography.Text>
          Tiêu đề: <strong>{title}</strong>
        </Typography.Text>
        <Typography.Text>
          Kênh: <strong>{channels.join(", ")}</strong>
        </Typography.Text>
        <Typography.Text>
          Link đích: <strong>{deepLink?.trim() ? deepLink : "không có (thông báo không bấm được)"}</strong>
        </Typography.Text>
        <Typography.Text>
          Số đối tượng nhận: <strong>{recipientCount.toLocaleString()}</strong>
        </Typography.Text>
        {requiresRetype && (
          <Form.Item
            label="Vui lòng gõ lại số đối tượng nhận để xác nhận"
            validateStatus={typedOk ? undefined : "error"}
            help={typedOk ? undefined : "Số nhập không khớp"}
          >
            <Input
              value={typedCount}
              onChange={(e) => setTypedCount(e.target.value)}
              placeholder={String(recipientCount)}
              autoFocus
            />
          </Form.Item>
        )}
      </Space>
    </Modal>
  );
}
