import { useState } from "react";
import { Form, Input, Modal, Typography } from "antd";
import type { OfficialEventStatus } from "../shared/types";

interface EventTransitionModalProps {
  open: boolean;
  eventTitle: string;
  toStatus: OfficialEventStatus;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  confirmLoading?: boolean;
}

// Nhãn theo HÀNH ĐỘNG thật chứ không phải tên trạng thái đích: chọn "published" thực chất gọi
// POST /submit và đưa event sang PENDING_APPROVAL (EventService.submit), nói "chuyển sang published"
// là hứa sai với người dùng.
const ACTION_LABEL: Partial<Record<OfficialEventStatus, string>> = {
  published: "Gửi event đi duyệt",
  cancelled: "Huỷ event",
};

export function EventTransitionModal({ open, eventTitle, toStatus, onClose, onConfirm, confirmLoading }: EventTransitionModalProps) {
  const [reason, setReason] = useState("");
  const requiresReason = toStatus === "cancelled";

  return (
    <Modal
      open={open}
      title={ACTION_LABEL[toStatus] ?? `Chuyển trạng thái sang ${toStatus}`}
      onCancel={onClose}
      onOk={() => onConfirm(requiresReason ? reason : undefined)}
      confirmLoading={confirmLoading}
      okText="Xác nhận"
      cancelText="Huỷ"
      okButtonProps={{ danger: toStatus === "cancelled", disabled: requiresReason && !reason.trim() }}
      afterClose={() => setReason("")}
    >
      <Typography.Text>
        {toStatus === "published" ? (
          <>
            Event <strong>{eventTitle}</strong> sẽ được gửi đi duyệt (chuyển sang{" "}
            <strong>pending_approval</strong>), chưa hiển thị công khai.
          </>
        ) : (
          <>
            Event <strong>{eventTitle}</strong> sẽ chuyển sang trạng thái <strong>{toStatus}</strong>.
          </>
        )}
      </Typography.Text>
      {toStatus === "cancelled" && (
        <Form.Item
          label="Lý do huỷ (bắt buộc)"
          validateStatus={reason.trim() ? undefined : "error"}
          help={reason.trim() ? undefined : "Vui lòng nhập lý do"}
          style={{ marginTop: 16 }}
        >
          <Input.TextArea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Registrants sẽ nhận thông báo huỷ. Nhập lý do rõ ràng."
          />
        </Form.Item>
      )}
    </Modal>
  );
}
