import { useRef, useState } from "react";
import { Alert, Form, Input, Modal, Radio, Space, Typography, message } from "antd";
import { useCommerceConfig } from "../../payments/api/payments.api";
import { useCreateAdjustment, useWallet } from "../api/wallets.api";
import { parseMoneyInput } from "../../shared/utils";

interface AdjustModalProps {
  userId: string;
  userLabel?: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  creditOnly?: boolean;
}

function formatCoin(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount)} Fcoin`;
}

export function AdjustModal({
  userId,
  userLabel,
  open,
  onClose,
  onSuccess,
  creditOnly = false,
}: AdjustModalProps) {
  const create = useCreateAdjustment();
  const { data: config } = useCommerceConfig();
  const { data: wallet } = useWallet(open ? userId : undefined);
  const threshold = config?.walletAdjustDualApprovalThreshold ?? 1_000_000;
  const idempotencyKey = useRef<string | null>(null);

  const [sign, setSign] = useState<"plus" | "minus">("plus");
  const [rawAmount, setRawAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amountValue = parseMoneyInput(rawAmount) ?? 0;
  const effectiveSign = creditOnly ? "plus" : sign;
  const signedAmount = effectiveSign === "plus" ? amountValue : -amountValue;
  const exceedsThreshold = Math.abs(signedAmount) >= threshold;

  function handleClose() {
    setRawAmount("");
    setReason("");
    setError(null);
    setSign("plus");
    idempotencyKey.current = null;
    onClose();
  }

  function handleSubmit() {
    if (create.isPending) return;
    setError(null);
    if (amountValue <= 0) {
      setError("Vui lòng nhập số Fcoin cần điều chỉnh");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do");
      return;
    }
    idempotencyKey.current ??= crypto.randomUUID();
    create.mutate(
      {
        userId,
        amount: signedAmount,
        reason: reason.trim(),
        idempotencyKey: idempotencyKey.current,
      },
      {
        onSuccess: (adj) => {
          message.success(
            adj.status === "pending_approval"
              ? "Đã gửi yêu cầu điều chỉnh chờ duyệt"
              : "Đã điều chỉnh số dư"
          );
          onSuccess?.();
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
      title={creditOnly ? `Cộng Fcoin${userLabel ? ` cho ${userLabel}` : ""}` : "Điều chỉnh số dư ví"}
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={create.isPending}
      okText={creditOnly ? "Cộng Fcoin" : "Xác nhận"}
      cancelText="Huỷ"
      okButtonProps={{ disabled: create.isPending }}
      cancelButtonProps={{ disabled: create.isPending }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Alert
          type="info"
          message={wallet ? `Số dư hiện tại: ${formatCoin(wallet.balance)}` : "Mọi thay đổi đều được ghi nhận"}
          description="Giao dịch sẽ được lưu vào lịch sử ví và nhật ký quản trị. Học viên cũng nhận được thông báo kèm lý do."
          showIcon
        />
        {exceedsThreshold && (
          <Alert
            type="error"
            message="Cần người thứ hai duyệt"
            description={`Số lượng ${formatCoin(Math.abs(signedAmount))} đạt ngưỡng ${formatCoin(threshold)}. Yêu cầu sẽ chuyển sang trạng thái chờ duyệt và chưa cộng ngay.`}
            showIcon
          />
        )}
        {!creditOnly && (
          <Form.Item label="Loại điều chỉnh" required>
            <Radio.Group
              value={sign}
              onChange={(e) => {
                setSign(e.target.value);
                idempotencyKey.current = null;
              }}
            >
              <Radio value="plus">Cộng Fcoin</Radio>
              <Radio value="minus">Trừ Fcoin</Radio>
            </Radio.Group>
          </Form.Item>
        )}
        <Form.Item
          label="Số lượng Fcoin"
          validateStatus={error ? "error" : undefined}
          help={error}
          required
        >
          <Input
            value={rawAmount}
            onChange={(e) => {
              setRawAmount(e.target.value.replace(/\D/g, ""));
              setError(null);
              idempotencyKey.current = null;
            }}
            inputMode="numeric"
            suffix="Fcoin"
            placeholder="Ví dụ: 44000"
          />
        </Form.Item>
        <Typography.Text type="secondary">
          Giá trị thực tế: <strong>{signedAmount > 0 ? "+" : ""}{formatCoin(signedAmount)}</strong>
        </Typography.Text>
        <Form.Item label="Lý do" required>
          <Input.TextArea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
              idempotencyKey.current = null;
            }}
            maxLength={500}
            showCount
            placeholder="Ví dụ: Thưởng sự kiện video tháng 9/2026"
          />
        </Form.Item>
      </Space>
    </Modal>
  );
}
