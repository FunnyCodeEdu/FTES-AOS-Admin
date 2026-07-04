import { useState } from "react";
import { Alert, Form, Input, Modal, Radio, Space, Typography, message } from "antd";
import { useCommerceConfig } from "../../payments/api/payments.api";
import { useCreateAdjustment } from "../api/wallets.api";
import { formatVND, parseMoneyInput } from "../../shared/utils";

interface AdjustModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function AdjustModal({ userId, open, onClose }: AdjustModalProps) {
  const create = useCreateAdjustment();
  const { data: config } = useCommerceConfig();
  const threshold = config?.walletAdjustDualApprovalThreshold ?? 1_000_000;

  const [sign, setSign] = useState<"plus" | "minus">("plus");
  const [rawAmount, setRawAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amountValue = parseMoneyInput(rawAmount) ?? 0;
  const signedAmount = sign === "plus" ? amountValue : -amountValue;
  const exceedsThreshold = Math.abs(signedAmount) > threshold;

  function handleClose() {
    setRawAmount("");
    setReason("");
    setError(null);
    onClose();
  }

  function handleSubmit() {
    setError(null);
    if (amountValue <= 0) {
      setError("Vui lòng nhập số tiền điều chỉnh");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do");
      return;
    }
    create.mutate(
      { userId, amount: signedAmount, reason: reason.trim(), threshold },
      {
        onSuccess: (adj) => {
          message.success(
            adj.status === "pending_approval"
              ? "Đã gửi yêu cầu điều chỉnh chờ duyệt"
              : "Đã điều chỉnh số dư"
          );
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
      title="Điều chỉnh số dư ví"
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={create.isPending}
      okText="Xác nhận"
      cancelText="Huỷ"
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Alert
          type="warning"
          message="Hệ quả"
          description="Điều chỉnh ghi log ledger và audit. Số dư sẽ thay đổi ngay lập tức hoặc chuyển chờ duyệt nếu vượt ngưỡng."
          showIcon
        />
        {exceedsThreshold && (
          <Alert
            type="error"
            message="Cần duyệt 2 ngưởi"
            description={`Số tiền ${formatVND(Math.abs(signedAmount))} vượt ngưỡng ${formatVND(threshold)}. Yêu cầu sẽ chuyển chờ ngưởi duyệt thứ hai.`}
            showIcon
          />
        )}
        <Form.Item label="Loại điều chỉnh" required>
          <Radio.Group value={sign} onChange={(e) => setSign(e.target.value)}>
            <Radio value="plus">Cộng tiền</Radio>
            <Radio value="minus">Trừ tiền</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label="Số tiền (VND)"
          validateStatus={error ? "error" : undefined}
          help={error}
          required
        >
          <Input
            value={rawAmount}
            onChange={(e) => setRawAmount(e.target.value)}
            placeholder="Nhập số tiền"
          />
        </Form.Item>
        <Typography.Text type="secondary">
          Giá trị thực tế: <strong>{signedAmount > 0 ? "+" : ""}{formatVND(signedAmount)}</strong>
        </Typography.Text>
        <Form.Item label="Lý do" required>
          <Input.TextArea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bắt buộc — lý do điều chỉnh"
          />
        </Form.Item>
      </Space>
    </Modal>
  );
}
