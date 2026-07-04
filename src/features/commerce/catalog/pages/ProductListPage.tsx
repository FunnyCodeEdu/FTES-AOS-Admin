import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
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
import { Can } from "../../../../shared/permissions";
import { useDeleteProduct, useFulfillments, useProducts, useUpdateFulfillmentStatus } from "../api/catalog.api";
import { ProductFormDrawer } from "../components/ProductFormDrawer";
import { formatVND } from "../../shared/utils";
import type { Fulfillment, Product, ProductStatus, ProductType } from "../../shared/types";
import type { TableProps } from "antd";

const TYPE_OPTIONS: { label: string; value: ProductType }[] = [
  { label: "Merchandise", value: "merchandise" },
  { label: "Premium", value: "premium" },
  { label: "AI Credits", value: "ai_credits" },
  { label: "Voucher", value: "voucher" },
  { label: "Course Unlock", value: "course_unlock" },
];

const STATUS_OPTIONS: { label: string; value: ProductStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Draft", value: "draft" },
];

const FULFILLMENT_STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Packed", value: "packed" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
];

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const type = (searchParams.get("type") as ProductType | undefined) ?? undefined;
  const status = (searchParams.get("status") as ProductStatus | undefined) ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useProducts({
    type,
    status,
    search: searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });
  const deleteProduct = useDeleteProduct();
  const { data: fulfillments } = useFulfillments();
  const updateFulfillment = useUpdateFulfillmentStatus();

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

  function handleDelete() {
    if (!deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => {
        message.success("Đã xoá sản phẩm");
        setDeleteTarget(null);
      },
      onError: (err) => message.error(err.message),
    });
  }

  const productColumns: TableProps<Product>["columns"] = [
    { title: "Tên", dataIndex: "name" },
    { title: "Loại", dataIndex: "type", render: (t: ProductType) => <Tag>{t}</Tag> },
    { title: "Trạng thái", dataIndex: "status", render: (s: ProductStatus) => <Tag>{s}</Tag> },
    { title: "Giá", dataIndex: "basePrice", render: formatVND },
    {
      title: "Thao tác",
      render: (_: unknown, record: Product) => (
        <Space>
          <Can permissions={["commerce.product.manage"]}>
            <Button size="small" onClick={() => { setSelectedProduct(record); setDrawerOpen(true); }}>
              Sửa
            </Button>
            <Button size="small" danger onClick={() => setDeleteTarget(record)}>
              Xoá
            </Button>
          </Can>
        </Space>
      ),
    },
  ];

  const fulfillmentColumns: TableProps<Fulfillment>["columns"] = [
    { title: "Order", dataIndex: "orderCode" },
    { title: "Sản phẩm", dataIndex: "productName" },
    { title: "Ngưởi nhận", dataIndex: "recipientName" },
    { title: "Trạng thái", dataIndex: "status", render: (s: string) => <Tag>{s}</Tag> },
    {
      title: "Cập nhật",
      render: (_: unknown, record: Fulfillment) => (
        <Can permissions={["commerce.product.manage"]}>
          <Select
            value={record.status}
            options={FULFILLMENT_STATUS_OPTIONS}
            onChange={(value) =>
              updateFulfillment.mutate({ id: record.id, status: value, trackingCode: record.trackingCode })
            }
            style={{ width: 140 }}
          />
        </Can>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Marketplace</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tên sản phẩm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Loại"
            allowClear
            value={type}
            options={TYPE_OPTIONS}
            onChange={(value) => updateParams({ type: value, page: undefined })}
            style={{ width: 160 }}
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
          <Can permissions={["commerce.product.manage"]}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setSelectedProduct(null); setDrawerOpen(true); }}
            >
              Tạo sản phẩm
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách sản phẩm"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={productColumns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, ps) => updateParams({ page: p, pageSize: ps }),
        }}
      />

      <Card title="Fulfillment" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          columns={fulfillmentColumns}
          dataSource={fulfillments?.items ?? []}
          pagination={false}
        />
      </Card>

      <ProductFormDrawer
        open={drawerOpen}
        product={selectedProduct}
        onClose={() => setDrawerOpen(false)}
      />

      <Modal
        open={!!deleteTarget}
        title="Xoá sản phẩm"
        onOk={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLoading={deleteProduct.isPending}
        okText="Xoá"
        cancelText="Huỷ"
      >
        <Typography.Text>
          Sản phẩm <strong>{deleteTarget?.name}</strong> sẽ không còn khả dụng để mua. Tiếp tục?
        </Typography.Text>
      </Modal>
    </div>
  );
}
