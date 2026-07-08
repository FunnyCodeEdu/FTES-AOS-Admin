import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Can } from "../../../../shared/permissions";
import { useCouponStats, useCoupons, useDisableCoupon } from "../api/catalog.api";
import { CouponFormModal } from "../components/CouponFormModal";
import { formatVND } from "../../shared/utils";
import type { Coupon, CouponStatus } from "../../shared/types";
import type { TableProps } from "antd";

const STATUS_OPTIONS: { label: string; value: CouponStatus }[] = [
  { label: "Đang hoạt động", value: "active" },
  { label: "Không hoạt động", value: "inactive" },
  { label: "Hết hạn", value: "expired" },
];

export default function CouponListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [disableTarget, setDisableTarget] = useState<Coupon | null>(null);

  const status = (searchParams.get("status") as CouponStatus | undefined) ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useCoupons({
    status,
    search: searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });
  const disable = useDisableCoupon();
  const { data: stats } = useCouponStats(selectedCoupon?.id);

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
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  function openDisable(coupon: Coupon) {
    setDisableTarget(coupon);
    setDisableReason("");
    setDisableOpen(true);
  }

  function handleDisable() {
    if (!disableTarget) return;
    if (!disableReason.trim()) {
      message.error("Vui lòng nhập lý do");
      return;
    }
    disable.mutate(
      { id: disableTarget.id, reason: disableReason.trim() },
      {
        onSuccess: () => {
          message.success("Đã vô hiệu hoá coupon");
          setDisableOpen(false);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  const columns: TableProps<Coupon>["columns"] = [
    { title: "Mã", dataIndex: "code" },
    { title: "Loại", dataIndex: "type" },
    { title: "Giá trị", dataIndex: "value" },
    { title: "Đã dùng", dataIndex: "usedCount" },
    { title: "Trạng thái", dataIndex: "status", render: (s: CouponStatus) => <Tag>{s}</Tag> },
    { title: "Hiệu lực đến", dataIndex: "validTo", render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY") : "—") },
    {
      title: "Thao tác",
      render: (_: unknown, record: Coupon) => (
        <Space>
          <Can permissions={["coupon.manage"]}>
            <Button size="small" onClick={() => { setSelectedCoupon(record); setFormOpen(true); }}>
              Sửa
            </Button>
            <Button size="small" danger onClick={() => openDisable(record)}>
              Vô hiệu
            </Button>
          </Can>
          <Button size="small" onClick={() => setSelectedCoupon(record)}>
            Stats
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Coupon</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Mã coupon"
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
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
          <Can permissions={["coupon.manage"]}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setSelectedCoupon(null); setFormOpen(true); }}
            >
              Tạo coupon
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách coupon"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {selectedCoupon && stats && (
        <Card title={`Thống kê ${selectedCoupon.code}`} style={{ marginBottom: 16 }}>
          <Descriptions bordered column={4}>
            <Descriptions.Item label="Lượt dùng">{stats.uses}</Descriptions.Item>
            <Descriptions.Item label="User unique">{stats.uniqueUsers}</Descriptions.Item>
            <Descriptions.Item label="Tác động doanh thu">{formatVND(stats.revenueImpact)}</Descriptions.Item>
          </Descriptions>
        </Card>
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

      <CouponFormModal
        open={formOpen}
        coupon={selectedCoupon}
        onClose={() => setFormOpen(false)}
      />

      <Modal
        open={disableOpen}
        title="Vô hiệu hoá coupon"
        onOk={handleDisable}
        onCancel={() => setDisableOpen(false)}
        confirmLoading={disable.isPending}
        okText="Vô hiệu"
        cancelText="Huỷ"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Coupon <strong>{disableTarget?.code}</strong> sẽ không thể sử dụng thêm.
          </Typography.Text>
          <Input.TextArea
            rows={3}
            value={disableReason}
            onChange={(e) => setDisableReason(e.target.value)}
            placeholder="Lý do vô hiệu hoá (bắt buộc)"
          />
        </Space>
      </Modal>
    </div>
  );
}
