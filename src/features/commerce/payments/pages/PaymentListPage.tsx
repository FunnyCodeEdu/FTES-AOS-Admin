import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { usePayments } from "../api/payments.api";
import { formatVND } from "../../shared/utils";
import type { Payment, PaymentMatchStatus } from "../../shared/types";
import type { TableProps } from "antd";

const MATCH_OPTIONS: { label: string; value: PaymentMatchStatus }[] = [
  { label: "Đã khớp", value: "matched" },
  { label: "Chưa khớp", value: "unmatched" },
  { label: "Trùng lặp", value: "duplicate" },
];

function matchColor(status: PaymentMatchStatus) {
  switch (status) {
    case "matched":
      return "success";
    case "unmatched":
      return "warning";
    case "duplicate":
      return "error";
    default:
      return "default";
  }
}

export default function PaymentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const matchStatus = (searchParams.get("matchStatus") as PaymentMatchStatus | undefined) ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = usePayments({
    matchStatus,
    search: searchParams.get("search") ?? undefined,
    dateFrom,
    dateTo,
    page,
    pageSize,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) {
        updateParams({ search: search || undefined, page: undefined });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    setSearchParams(params);
  }

  const columns: TableProps<Payment>["columns"] = [
    { title: "Mã giao dịch", dataIndex: "transactionCode" },
    { title: "Số tiền", dataIndex: "amount", render: formatVND },
    { title: "Trạng thái khớp", dataIndex: "matchStatus", render: (s: PaymentMatchStatus) => <Tag color={matchColor(s)}>{s}</Tag> },
    { title: "Order", dataIndex: "orderCode" },
    { title: "Ngân hàng", dataIndex: "bankName" },
    { title: "Nhận lúc", dataIndex: "receivedAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
  ];

  return (
    <div>
      <Typography.Title level={3}>Thanh toán (VietQR webhooks)</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Mã giao dịch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Trạng thái khớp"
            allowClear
            value={matchStatus}
            options={MATCH_OPTIONS}
            onChange={(value) => updateParams({ matchStatus: value, page: undefined })}
            style={{ width: 160 }}
          />
          <DatePicker.RangePicker
            value={[
              dateFrom ? dayjs(dateFrom) : null,
              dateTo ? dayjs(dateTo) : null,
            ]}
            onChange={(range) => {
              updateParams({
                dateFrom: range?.[0]?.toISOString(),
                dateTo: range?.[1]?.toISOString(),
                page: undefined,
              });
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách thanh toán"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, ps) => updateParams({ page: p, pageSize: ps }),
        }}
      />
    </div>
  );
}
