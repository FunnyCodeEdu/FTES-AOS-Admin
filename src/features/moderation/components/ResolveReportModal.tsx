import { useState } from "react";
import { Alert, Form, Input, Modal, Radio, Space, Typography, message } from "antd";
import { useResolveReport } from "../api/moderation.api";
import type { Report, ResolveAction } from "../../community/shared/types";

interface ResolveReportModalProps {
  report: Report | null;
  open: boolean;
  onClose: () => void;
}

export function ResolveReportModal({ report, open, onClose }: ResolveReportModalProps) {
  const resolve = useResolveReport();
  const [action, setAction] = useState<ResolveAction>("approve");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setReason("");
    setError(null);
    onClose();
  }

  function handleSubmit() {
    setError(null);
    if (!report) return;
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do");
      return;
    }
    if (action === "remove" && reason.trim().length < 10) {
      setError("Lý do gỡ bỏ cần ít nhất 10 ký tự");
      return;
    }
    resolve.mutate(
      { id: report.id, action, reason: reason.trim() },
      {
        onSuccess: () => {
          message.success("Đã xử lý report");
          handleClose();
        },
        onError: (err) => {
          setError(err.message);
          message.error(err.message);
        },
      }
    );
  }

  return (
    <Modal
      open={open}
      title="Xử lý report"
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={resolve.isPending}
      okText="Xác nhận"
      cancelText="Huỷ"
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        {report && (
          <Typography.Text>
            Report: <strong>{report.targetTitle}</strong> — {report.targetType}
          </Typography.Text>
        )}
        {action === "remove" && (
          <Alert
            type="warning"
            message="Hệ quả"
            description="Nội dung bị gỡ khỏi cộng đồng, tác giả được thông báo. Hành động ghi audit."
            showIcon
          />
        )}
        {action === "reject" && (
          <Alert
            type="info"
            message="Hệ quả"
            description="Báo cáo bị từ chối, nội dung giữ nguyên trạng thái."
            showIcon
          />
        )}
        <Form.Item label="Hành động" required>
          <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
            <Radio value="approve">Approve (giữ nội dung)</Radio>
            <Radio value="reject">Reject (từ chối báo cáo)</Radio>
            <Radio value="remove">Remove (gỡ nội dung)</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label="Lý do"
          validateStatus={error ? "error" : undefined}
          help={error}
          required
        >
          <Input.TextArea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bắt buộc — lý do xử lý report"
          />
        </Form.Item>
      </Space>
    </Modal>
  );
}
