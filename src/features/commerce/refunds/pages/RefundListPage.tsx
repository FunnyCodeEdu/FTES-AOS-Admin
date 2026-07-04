import { Link, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useRefunds } from "../api/refunds.api";
import { RefundStatusBadge } from "../components/RefundStatusBadge";
import { formatVND } from "../../shared/utils";
import type { Refund, RefundStatus } from "../../shared/types";
import type { TableProps } from "antd";

const STATUS_OPTIONS: { label: string; value: RefundStatus }[] = [
  { label: "Đã yêu cầu", value: "requested" },
  { label: "Đã duyệt", value: "approved" },
  { label: "Đã từ chối", value: "rejected" },
  { label: "Đã thực thi", value: "executed" },
  { label: "Thực thi lỗi", value: "execution_failed" },
];

export default function RefundListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get("status") as RefundStatus | undefined) ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useRefunds({
    status,
    dateFrom,
    dateTo,
    page,
    pageSize,
  });

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

  const columns: TableProps<Refund>["columns"] = [
    { title: "Mã refund", dataIndex: "id", render: (_, r) => <Link to={`/commerce/refunds/${r.id}`}>{r.id}</Link> },
    { title: "Order", dataIndex: "orderCode" },
    { title: "Số tiền", dataIndex: "amount", render: formatVND },
    { title: "Lý do", dataIndex: "reason", ellipsis: true },
    { title: "Trạng thái", dataIndex: "status", render: (s: RefundStatus) => <RefundStatusBadge status={s} /> },
    { title: "Ngưởi tạo", dataIndex: "createdByName" },
    { title: "Ngày tạo", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
  ];

  return (
    <div>
      <Typography.Title level={3}>Yêu cầu refund</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
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
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách refund"
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
