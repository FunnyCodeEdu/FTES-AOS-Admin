import { Link } from "react-router-dom";
import { Alert, Descriptions, Space, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";

import type {
  PayrollOrderContribution,
  PayrollOrderContributionTotals,
} from "../types";
import { formatDate, formatVnd } from "../format";

interface OrderContributionsTableProps {
  items?: PayrollOrderContribution[];
  totals?: PayrollOrderContributionTotals | null;
  linkToAdminOrder?: boolean;
}

/** Ledger chỉ-đọc: mỗi dòng là số tiền một đơn đã đóng góp vào kỳ lương. */
export function OrderContributionsTable({
  items = [],
  totals,
  linkToAdminOrder = false,
}: OrderContributionsTableProps) {
  const columns: TableProps<PayrollOrderContribution>["columns"] = [
    {
      title: "Mã đơn hàng",
      dataIndex: "orderId",
      key: "orderId",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {linkToAdminOrder ? (
            <Link to={`/commerce/orders/${encodeURIComponent(record.orderId)}`}>
              {record.orderId}
            </Link>
          ) : (
            <Typography.Text copyable={{ text: record.orderId }}>{record.orderId}</Typography.Text>
          )}
          <Typography.Text type="secondary">{formatDate(record.orderCreatedAt)}</Typography.Text>
          {record.orderStatus && <Tag>{record.orderStatus}</Tag>}
        </Space>
      ),
    },
    {
      title: "Học viên",
      key: "student",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{record.studentName || record.studentId || "—"}</Typography.Text>
          <Typography.Text type="secondary" copyable={record.studentEmail ? { text: record.studentEmail } : false}>
            {record.studentEmail || "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Khóa / gói",
      key: "items",
      render: (_, record) =>
        (record.items ?? []).length > 0 ? (
          <Space direction="vertical" size={4}>
            {record.items.map((item, index) => (
              <div key={`${item.courseId}:${item.packageId ?? index}`}>
                <Typography.Text>{item.courseName || item.courseId}</Typography.Text>
                <br />
                <Typography.Text type="secondary">
                  {item.packageName || item.packageId || "Mua trọn khóa"} · {formatVnd(item.grossAmount)}
                </Typography.Text>
              </div>
            ))}
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Đã thanh toán",
      dataIndex: "paidAmount",
      key: "paidAmount",
      align: "right",
      render: formatVnd,
    },
    {
      title: "Căn cứ / tỷ lệ",
      key: "basis",
      align: "right",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{formatVnd(record.commissionBasis)}</Typography.Text>
          <Typography.Text type="secondary">
            Ròng sau giảm · {record.commissionRatePercent}%
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Cộng cho giảng viên",
      key: "contribution",
      align: "right",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{formatVnd(record.instructorContribution)}</Typography.Text>
          <Typography.Text type="secondary">Ghi nhận {formatDate(record.accruedAt)}</Typography.Text>
          {record.reversedAt ? (
            <Tag color="error">Đã hoàn/đảo {formatDate(record.reversedAt)}</Tag>
          ) : (
            <Tag color="success">Đang tính trong lương</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {totals && (
        <>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
            <Descriptions.Item label="Số đơn">{totals.orderCount}</Descriptions.Item>
            <Descriptions.Item label="Tổng khách đã trả">
              {formatVnd(totals.orderPaidTotal)}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng căn cứ tính lương">
              {formatVnd(totals.commissionBasisTotal)}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng từng đơn đã cộng">
              {formatVnd(totals.originalContributionTotal)}
            </Descriptions.Item>
            <Descriptions.Item label="Đã hoàn/đảo">
              {formatVnd(totals.reversedContributionTotal)}
            </Descriptions.Item>
            <Descriptions.Item label="Còn hiệu lực từ đơn">
              {formatVnd(totals.activeContributionTotal)}
            </Descriptions.Item>
            <Descriptions.Item label="Doanh thu trên kỳ">
              {formatVnd(totals.payrollGrossRevenue)}
            </Descriptions.Item>
            <Descriptions.Item label="Chênh lệch ledger">
              {formatVnd(totals.ledgerVariance)}
            </Descriptions.Item>
          </Descriptions>
          {!totals.ledgerBalanced && (
            <Alert
              type="warning"
              showIcon
              message="Ledger đơn hàng chưa khớp hoàn toàn với doanh thu kỳ lương"
              description="Chênh lệch thường đến từ dữ liệu chuyển đổi cũ hoặc khoản hoàn đã được đưa sang kỳ khác. Con số được hiển thị để admin đối soát, không bị che khuất."
            />
          )}
        </>
      )}
      <Table<PayrollOrderContribution>
        rowKey={(record) => `${record.orderId}:${record.accruedAt}`}
        size="small"
        columns={columns}
        dataSource={items}
        pagination={false}
        locale={{ emptyText: "Chưa có đơn hàng đóng góp trong kỳ này" }}
        scroll={{ x: 1280 }}
      />
    </Space>
  );
}
