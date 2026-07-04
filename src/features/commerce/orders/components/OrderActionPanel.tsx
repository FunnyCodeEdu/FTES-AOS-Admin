import { useState } from "react";
import { Alert, Button, Card, Form, Input, Modal, Space, Typography, message } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { useCancelOrder, useCompleteOrder, useRecheckPayment } from "../api/orders.api";
import type { Order } from "../../shared/types";

interface OrderActionPanelProps {
  order: Order;
}

type ActionType = "complete" | "cancel" | null;

export function OrderActionPanel({ order }: OrderActionPanelProps) {
  const recheck = useRecheckPayment();
  const complete = useCompleteOrder();
  const cancel = useCancelOrder();
  const [action, setAction] = useState<ActionType>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPending = order.status === "pending_payment";

  function handleOpen(type: ActionType) {
    setAction(type);
    setReason("");
    setError(null);
  }

  function handleClose() {
    setAction(null);
    setReason("");
    setError(null);
  }

  function handleConfirm() {
    setError(null);
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do");
      return;
    }
    if (action === "complete") {
      complete.mutate(
        { id: order.id, reason: reason.trim() },
        {
          onSuccess: () => {
            message.success("Đã đánh dấu hoàn tất order");
            handleClose();
          },
          onError: (err) => {
            setError(err.message);
            message.error(err.message);
          },
        }
      );
    } else if (action === "cancel") {
      cancel.mutate(
        { id: order.id, reason: reason.trim() },
        {
          onSuccess: () => {
            message.success("Đã huỷ order");
            handleClose();
          },
          onError: (err) => {
            setError(err.message);
            message.error(err.message);
          },
        }
      );
    }
  }

  return (
    <Can permissions={["commerce.order.manage"]}>
      <Card title="Xử lý order" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Các thao tác bên dưới ghi log audit. Vui lòng cẩn trọng.
          </Typography.Text>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => recheck.mutate(order.id)}
              loading={recheck.isPending}
              disabled={!isPending}
            >
              Kiểm tra lại thanh toán
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleOpen("complete")}
              disabled={!isPending}
            >
              Đánh dấu hoàn tất
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleOpen("cancel")}
              disabled={!isPending}
            >
              Huỷ order
            </Button>
          </Space>
        </Space>
      </Card>

      <Modal
        open={action !== null}
        title={action === "complete" ? "Đánh dấu hoàn tất order" : "Huỷ order"}
        onOk={handleConfirm}
        onCancel={handleClose}
        confirmLoading={complete.isPending || cancel.isPending}
        okText="Xác nhận"
        cancelText="Huỷ"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {action === "complete" && (
            <Alert
              type="warning"
              message="Hệ quả"
              description="Khoá học/sản phẩm trong order sẽ được kích hoạt entitlement cho khách hàng."
              showIcon
            />
          )}
          {action === "cancel" && (
            <Alert
              type="warning"
              message="Hệ quả"
              description="Order sẽ bị huỷ và không thể kích hoạt entitlement."
              showIcon
            />
          )}
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
              placeholder="Bắt buộc — ghi rõ lý do xử lý"
            />
          </Form.Item>
        </Space>
      </Modal>
    </Can>
  );
}
