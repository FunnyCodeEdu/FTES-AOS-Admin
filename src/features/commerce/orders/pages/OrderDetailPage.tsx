import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Table, Typography } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useOrder } from "../api/orders.api";
import { PaymentTimeline } from "../components/PaymentTimeline";
import { OrderActionPanel } from "../components/OrderActionPanel";
import { RefundRequestButton } from "../components/RefundRequestButton";
import { formatVND } from "../../shared/utils";
import type { OrderItem, OrderPayment } from "../../shared/types";
import type { TableProps } from "antd";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;

  if (isError || !order) {
    return (
      <Alert
        type="error"
        message="Không thể tải chi tiết đơn hàng"
        description={error?.message}
        action={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const itemColumns: TableProps<OrderItem>["columns"] = [
    { title: "Sản phẩm", dataIndex: "productName" },
    { title: "Loại", dataIndex: "productType" },
    { title: "Số lượng", dataIndex: "quantity" },
    { title: "Đơn giá", dataIndex: "unitPrice", render: formatVND },
    { title: "Thành tiền", dataIndex: "total", render: formatVND },
    { title: "Fulfillment", dataIndex: "fulfillmentStatus", render: (v?: string) => v || "—" },
  ];

  const paymentColumns: TableProps<OrderPayment>["columns"] = [
    { title: "Mã giao dịch", dataIndex: "transactionCode", render: (v?: string) => v || "Chưa có" },
    { title: "Trạng thái", dataIndex: "status" },
    { title: "Số tiền", dataIndex: "amount", render: formatVND },
    { title: "Ngân hàng", dataIndex: "bankName", render: (v: string | undefined, r: OrderPayment) => v || r.gateway || "—" },
    { title: "Nội dung chuyển khoản", dataIndex: "transferDescription", render: (v?: string) => v || "—" },
    { title: "Thời gian", render: (_: unknown, r: OrderPayment) => dayjs(r.confirmedAt ?? r.createdAt).format("DD/MM/YYYY HH:mm:ss") },
  ];

  return (
    <div>
      <Typography.Title level={3}>Chi tiết đơn hàng</Typography.Title>
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>
        <Link to="/commerce/orders">Quay lại danh sách</Link>
      </Button>

      <Card>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Mã order">{order.code}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{order.status}</Descriptions.Item>
          <Descriptions.Item label="Khách hàng">
            <Link to={`/users/${order.buyerId}`}>{order.buyerName ?? order.buyerEmail}</Link>
          </Descriptions.Item>
          <Descriptions.Item label="Email">{order.buyerEmail}</Descriptions.Item>
          <Descriptions.Item label="Phương thức">{order.payMethod ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">{formatVND(order.totalAmount)}</Descriptions.Item>
          <Descriptions.Item label="Đã trả">{formatVND(order.paidAmount)}</Descriptions.Item>
          <Descriptions.Item label="Giảm giá">{formatVND(order.discountAmount)}</Descriptions.Item>
          <Descriptions.Item label="Xu đã dùng">{order.coinApplied.toLocaleString("vi-VN")} Xu ({formatVND(order.coinDiscountVnd)})</Descriptions.Item>
          <Descriptions.Item label="Mã thanh toán">{order.payCode ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Nguồn dữ liệu">{order.legacy ? "Legacy (đã di chuyển)" : "Hệ thống hiện tại"}</Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {dayjs(order.createdAt).format("DD/MM/YYYY HH:mm")}
          </Descriptions.Item>
          <Descriptions.Item label="Thanh toán lúc">
            {order.paidAt ? dayjs(order.paidAt).format("DD/MM/YYYY HH:mm") : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật">
            {dayjs(order.updatedAt).format("DD/MM/YYYY HH:mm")}
          </Descriptions.Item>
          {order.description && (
            <Descriptions.Item label="Ghi chú" span={2}>{order.description}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Sản phẩm" style={{ marginTop: 16 }}>
        <Table rowKey="id" columns={itemColumns} dataSource={order.items} pagination={false} />
      </Card>

      <Card
        title="Giao dịch thanh toán"
        style={{ marginTop: 16 }}
        extra={<RefundRequestButton order={order} />}
      >
        <Table rowKey="id" columns={paymentColumns} dataSource={order.payments} pagination={false} />
      </Card>

      <Card title="Timeline thanh toán" style={{ marginTop: 16 }}>
        <PaymentTimeline events={order.paymentTimeline} />
      </Card>

      <OrderActionPanel order={order} />
    </div>
  );
}
