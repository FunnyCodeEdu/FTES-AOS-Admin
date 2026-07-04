import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Select,
  Skeleton,
  Table,
  Tabs,
  Typography,
} from "antd";
import { ReloadOutlined, WalletOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Can } from "../../../../shared/permissions";
import { useWallet, useWalletLedger } from "../api/wallets.api";
import { AdjustModal } from "../components/AdjustModal";
import { PendingAdjustmentsTab } from "../components/PendingAdjustmentsTab";
import { formatVND } from "../../shared/utils";
import type { WalletTransaction } from "../../shared/types";
import type { TableProps } from "antd";

const TYPE_OPTIONS = [
  { label: "Tất cả", value: "" },
  { label: "Nạp", value: "deposit" },
  { label: "Thanh toán", value: "payment" },
  { label: "Hoàn tiền", value: "refund" },
  { label: "Điều chỉnh", value: "adjustment" },
  { label: "Rút", value: "withdrawal" },
];

export default function WalletDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: wallet, isLoading, isError, error, refetch } = useWallet(userId);
  const { data: ledger } = useWalletLedger(userId);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");

  const columns: TableProps<WalletTransaction>["columns"] = [
    { title: "Loại", dataIndex: "type" },
    {
      title: "Số tiền",
      dataIndex: "amount",
      render: (v: number) => (
        <Typography.Text type={v >= 0 ? "success" : "danger"}>
          {v >= 0 ? "+" : ""}
          {formatVND(v)}
        </Typography.Text>
      ),
    },
    { title: "Số dư sau", dataIndex: "balanceAfter", render: formatVND },
    { title: "Lý do", dataIndex: "reason" },
    { title: "Ngưởi thực hiện", dataIndex: "actorName" },
    { title: "Thởi gian", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
  ];

  const filteredItems =
    (typeFilter
      ? ledger?.items.filter((t) => t.type === typeFilter)
      : ledger?.items) ?? [];

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (isError || !wallet) {
    return (
      <Alert
        type="error"
        message="Không thể tải thông tin ví"
        description={error?.message}
        action={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const items = [
    {
      key: "ledger",
      label: "Lịch sử giao dịch",
      children: (
        <>
          <Select
            value={typeFilter}
            options={TYPE_OPTIONS}
            onChange={setTypeFilter}
            style={{ width: 160, marginBottom: 16 }}
          />
          <Table rowKey="id" columns={columns} dataSource={filteredItems} pagination={false} />
        </>
      ),
    },
    {
      key: "pending",
      label: "Adjust chờ duyệt",
      children: <PendingAdjustmentsTab />,
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>
        <WalletOutlined /> Ví: {wallet.userName}
      </Typography.Title>
      <Card>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="User ID">{wallet.userId}</Descriptions.Item>
          <Descriptions.Item label="Email">{wallet.userEmail}</Descriptions.Item>
          <Descriptions.Item label="Số dư">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {formatVND(wallet.balance)}
            </Typography.Title>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{wallet.status}</Descriptions.Item>
        </Descriptions>
        <Can permissions={["wallet.adjust"]}>
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => setAdjustOpen(true)}>
            Điều chỉnh số dư
          </Button>
        </Can>
      </Card>

      <Tabs items={items} style={{ marginTop: 16 }} />

      <AdjustModal userId={wallet.userId} open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  );
}
