import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Typography } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useRefund } from "../api/refunds.api";
import { RefundStatusBadge } from "../components/RefundStatusBadge";
import { RefundTimeline } from "../components/RefundTimeline";
import { RefundActionPanel } from "../components/RefundActionPanel";
import { formatVND } from "../../shared/utils";

export default function RefundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: refund, isLoading, isError, error, refetch } = useRefund(id);

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;

  if (isError || !refund) {
    return (
      <Alert
        type="error"
        message="Không thể tải chi tiết refund"
        description={error?.message}
        action={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Typography.Title level={3}>Chi tiết yêu cầu refund</Typography.Title>
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>
        <Link to="/commerce/refunds">Quay lại danh sách</Link>
      </Button>

      <Card>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Mã refund">{refund.id}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <RefundStatusBadge status={refund.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Order">
            <Link to={`/commerce/orders/${refund.orderId}`}>{refund.orderCode}</Link>
          </Descriptions.Item>
          <Descriptions.Item label="Số tiền">{formatVND(refund.amount)}</Descriptions.Item>
          <Descriptions.Item label="Lý do">{refund.reason}</Descriptions.Item>
          <Descriptions.Item label="Kênh hoàn">{refund.payoutChannel ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Ngưởi tạo">{refund.createdByName}</Descriptions.Item>
          <Descriptions.Item label="Ngưởi duyệt">{refund.approvedByName ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Ngưởi thực thi">{refund.executedByName ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {dayjs(refund.createdAt).format("DD/MM/YYYY HH:mm")}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Timeline" style={{ marginTop: 16 }}>
        <RefundTimeline items={refund.timeline} />
      </Card>

      <RefundActionPanel refund={refund} />
    </div>
  );
}
