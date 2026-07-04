import { useState } from "react";
import { Button, Form, Input, Modal, Space, Typography, message } from "antd";
import { UndoOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { useCreateRefundRequest } from "../../refunds/api/refunds.api";
import { formatVND, parseMoneyInput } from "../../shared/utils";
import type { Order } from "../../shared/types";

interface RefundRequestButtonProps {
  order: Order;
}

export function RefundRequestButton({ order }: RefundRequestButtonProps) {
  const create = useCreateRefundRequest();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(order.paidAmount);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const maxAmount = order.paidAmount;

  function handleOpen() {
    setAmount(order.paidAmount);
    setReason("");
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setReason("");
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    if (amount === null || amount <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (amount > maxAmount) {
      setError(`Số tiền refund không được vượt quá ${formatVND(maxAmount)}`);
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do");
      return;
    }
    create.mutate(
      { orderId: order.id, amount, reason: reason.trim() },
      {
        onSuccess: () => {
          message.success("Đã tạo yêu cầu refund");
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
    <Can permissions={["commerce.refund.request"]}>
      <Button icon={<UndoOutlined />} onClick={handleOpen}>
        Tạo yêu cầu refund
      </Button>

      <Modal
        open={open}
        title="Tạo yêu cầu refund"
        onOk={handleSubmit}
        onCancel={handleClose}
        confirmLoading={create.isPending}
        okText="Tạo yêu cầu"
        cancelText="Huỷ"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Order: <strong>{order.code}</strong>
          </Typography.Text>
          <Typography.Text>
            Đã thanh toán: <strong>{formatVND(maxAmount)}</strong>
          </Typography.Text>
          <Form.Item
            label="Số tiền hoàn (VND)"
            validateStatus={error ? "error" : undefined}
            help={error}
            required
          >
            <Input
              value={amount !== null ? formatVND(amount).replace("₫", "").trim() : ""}
              onChange={(e) => {
                const parsed = parseMoneyInput(e.target.value);
                setAmount(parsed);
                if (parsed !== null && parsed > maxAmount) {
                  setError(`Số tiền refund không được vượt quá ${formatVND(maxAmount)}`);
                } else {
                  setError(null);
                }
              }}
              placeholder="Nhập số tiền"
            />
          </Form.Item>
          <Form.Item label="Lý do" required>
            <Input.TextArea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bắt buộc — lý do hoàn tiền"
            />
          </Form.Item>
        </Space>
      </Modal>
    </Can>
  );
}
