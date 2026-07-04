import { Card, Empty, Skeleton, Statistic, Table, Typography } from "antd";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { useTransactionSummary } from "../api/users.api";

interface TransactionsTabProps {
  userId: string;
}

export function TransactionsTab({ userId }: TransactionsTabProps) {
  const { data, isLoading } = useTransactionSummary(userId);

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!data) return <Empty description="Không thể tải tóm tắt giao dịch" />;

  const columns = [
    { title: "Loại", dataIndex: "type" },
    {
      title: "Số tiền",
      dataIndex: "amount",
      render: (v: number) => v.toLocaleString("vi-VN", { style: "currency", currency: "VND" }),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
    },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card>
          <Statistic title="Tổng chi" value={data.totalSpent} prefix="₫" />
        </Card>
        <Card>
          <Statistic title="Số đơn hàng" value={data.orderCount} />
        </Card>
        <Card>
          <Statistic title="Số dư ví" value={data.walletBalance} prefix="₫" />
        </Card>
      </div>
      <Typography.Paragraph>
        <Link to={`/commerce/orders?userId=${userId}`}>Xem toàn bộ đơn hàng →</Link>
      </Typography.Paragraph>
      <Table rowKey="transactionId" columns={columns} dataSource={data.recentTransactions} pagination={false} />
    </div>
  );
}
