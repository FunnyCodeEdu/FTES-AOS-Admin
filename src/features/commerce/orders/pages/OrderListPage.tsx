import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useOrders } from "../api/orders.api";
import { formatVND } from "../../shared/utils";
import type { Order, OrderStatus } from "../../shared/types";
import type { TableProps } from "antd";

// Giá trị = nguyên văn enum BE OrderStatus — filter GraphQL parseEnum chỉ nhận đúng các giá trị này.
const STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: "Khởi tạo", value: "PENDING" },
  { label: "Chờ thanh toán", value: "AWAITING_PAYMENT" },
  { label: "Đã thanh toán", value: "PAID" },
  { label: "Đang xử lý", value: "FULFILLING" },
  { label: "Hoàn tất", value: "SUCCESS" },
  { label: "Thất bại", value: "FAILED" },
  { label: "Đã huỷ", value: "CANCELLED" },
  { label: "Hết hạn", value: "EXPIRED" },
  { label: "Đã hoàn tiền", value: "REFUNDED" },
];

function statusColor(status: OrderStatus) {
  switch (status) {
    case "PENDING":
    case "AWAITING_PAYMENT":
      return "warning";
    case "PAID":
    case "FULFILLING":
      return "processing";
    case "SUCCESS":
      return "success";
    case "FAILED":
      return "error";
    case "CANCELLED":
    case "EXPIRED":
      return "default";
    case "REFUNDED":
      return "purple";
    default:
      return "default";
  }
}

function statusLabel(status: OrderStatus) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export default function OrderListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const status = (searchParams.get("status") as OrderStatus | undefined) ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const amountMin = searchParams.get("amountMin")
    ? Number(searchParams.get("amountMin"))
    : undefined;
  const amountMax = searchParams.get("amountMax")
    ? Number(searchParams.get("amountMax"))
    : undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useOrders({
    status,
    userId,
    search: searchParams.get("search") ?? undefined,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
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

  const columns: TableProps<Order>["columns"] = [
    { title: "Mã order", dataIndex: "code", render: (_, r) => <Link to={`/commerce/orders/${r.id}`}>{r.code}</Link> },
    { title: "Khách hàng", dataIndex: "buyerEmail" },
    { title: "Trạng thái", dataIndex: "status", render: (s: OrderStatus) => <Tag color={statusColor(s)}>{statusLabel(s)}</Tag> },
    { title: "Tổng tiền", dataIndex: "totalAmount", render: (v: number) => formatVND(v) },
    { title: "Đã trả", dataIndex: "paidAmount", render: (v: number) => formatVND(v) },
    { title: "Ngày tạo", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
  ];

  return (
    <div>
      <Typography.Title level={3}>Đơn hàng</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Mã order hoặc email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => updateParams({ status: value, page: undefined })}
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
          <InputNumber
            placeholder="Từ (VND)"
            value={amountMin}
            onChange={(v) => updateParams({ amountMin: v ?? undefined, page: undefined })}
            style={{ width: 140 }}
          />
          <InputNumber
            placeholder="Đến (VND)"
            value={amountMax}
            onChange={(v) => updateParams({ amountMax: v ?? undefined, page: undefined })}
            style={{ width: 140 }}
          />
          {userId && (
            <Tag closable onClose={() => updateParams({ userId: undefined, page: undefined })}>
              User: {userId}
            </Tag>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách đơn hàng"
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
