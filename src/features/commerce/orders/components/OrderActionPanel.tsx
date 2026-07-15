import { useState } from "react";
import { Alert, Button, Card, Form, Input, Modal, Space, Tooltip, Typography, message } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { useCancelOrder, useRecheckPayment } from "../api/orders.api";
import type { Order } from "../../shared/types";

interface OrderActionPanelProps {
  order: Order;
}

export function OrderActionPanel({ order }: OrderActionPanelProps) {
  const recheck = useRecheckPayment();
  const cancel = useCancelOrder();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // BE trả OrderStatus.name() UPPERCASE; đơn còn xử lý được khi chưa thanh toán xong.
  const isPending = order.status === "PENDING" || order.status === "AWAITING_PAYMENT";

  function handleOpenCancel() {
    setCancelOpen(true);
    setReason("");
    setError(null);
  }

  function handleClose() {
    setCancelOpen(false);
    setReason("");
    setError(null);
  }

  function handleConfirmCancel() {
    setError(null);
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do");
      return;
    }
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

  return (
    <Can permissions={["admin.commerce.manage"]}>
      <Card title="Xử lý order" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Các thao tác bên dưới ghi log audit. Vui lòng cẩn trọng.
          </Typography.Text>
          <Space>
            <Tooltip title={isPending ? "" : "Chỉ áp dụng cho đơn chưa thanh toán"}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() =>
                  recheck.mutate(order.id, {
                    onSuccess: () => message.success("Đã kiểm tra lại thanh toán"),
                  })
                }
                loading={recheck.isPending}
                disabled={!isPending}
              >
                Kiểm tra lại thanh toán
              </Button>
            </Tooltip>
            <Tooltip title="BE chưa có endpoint đánh dấu hoàn tất thủ công — dùng 'Kiểm tra lại thanh toán' để kích hoạt entitlement khi webhook lỡ">
              <Button type="primary" icon={<CheckCircleOutlined />} disabled>
                Đánh dấu hoàn tất
              </Button>
            </Tooltip>
            <Tooltip title={isPending ? "" : "Chỉ huỷ được đơn chưa thanh toán"}>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={handleOpenCancel}
                disabled={!isPending}
              >
                Huỷ order
              </Button>
            </Tooltip>
          </Space>
        </Space>
      </Card>

      <Modal
        open={cancelOpen}
        title="Huỷ order"
        onOk={handleConfirmCancel}
        onCancel={handleClose}
        confirmLoading={cancel.isPending}
        okText="Xác nhận"
        cancelText="Huỷ"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert
            type="warning"
            message="Hệ quả"
            description="Order sẽ bị huỷ và không thể kích hoạt entitlement."
            showIcon
          />
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
