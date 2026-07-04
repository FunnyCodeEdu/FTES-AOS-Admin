import { useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Input, Modal, Skeleton, Space, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import type { Pack, PackFilterFormValues, PackListParams, PackStatus } from "../../types";
import { useCreatePack, useDeletePack, usePacks } from "../api/packs.api";
import { PackFormModal } from "../components/PackFormModal";
import { PackTable } from "../components/PackTable";
import type { PackFormValues } from "../../types";

const DEFAULT_PAGE_SIZE = 10;

function parseParams(searchParams: URLSearchParams): PackListParams {
  return {
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as PackStatus) || undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10),
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
  };
}

function buildSearchParams(values: PackListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (values.search) params.set("search", values.search);
  if (values.status) params.set("status", values.status);
  params.set("page", String(values.page));
  params.set("pageSize", String(values.pageSize));
  if (values.sortBy) params.set("sortBy", values.sortBy);
  if (values.sortOrder) params.set("sortOrder", values.sortOrder);
  return params;
}

export default function PackListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const { data, isLoading, isError, error, refetch } = usePacks(params);

  const [formOpen, setFormOpen] = useState(false);

  const createPack = useCreatePack();
  const deletePack = useDeletePack();

  const filterValues: PackFilterFormValues = useMemo(
    () => ({
      search: params.search,
      status: params.status,
    }),
    [params]
  );

  const handleFilterChange = (values: PackFilterFormValues) => {
    setSearchParams(buildSearchParams({ ...params, ...values, page: 1 }));
  };

  const handleTableChange: TableProps<Pack>["onChange"] = (pagination, _filters, sorter) => {
    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    setSearchParams(
      buildSearchParams({
        ...params,
        page: pagination.current ?? 1,
        pageSize: pagination.pageSize ?? DEFAULT_PAGE_SIZE,
        sortBy: singleSorter?.field ? String(singleSorter.field) : undefined,
        sortOrder: singleSorter?.order
          ? singleSorter.order === "ascend"
            ? "asc"
            : "desc"
          : undefined,
      })
    );
  };

  const handleSubmit = (values: PackFormValues) => {
    createPack.mutate(values, {
      onSuccess: () => {
        message.success("Đã tạo pack");
        setFormOpen(false);
      },
      onError: (err: Error) => message.error(err.message || "Tạo thất bại"),
    });
  };

  const handleDelete = (pack: Pack) => {
    Modal.confirm({
      title: "Xoá pack",
      content: (
        <>
          Xoá <strong>{pack.name}</strong> sẽ kết thúc quyền truy cập của học viên qua pack này.
          Thao tác không thể hoàn tác và được ghi audit.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        deletePack.mutate(pack.id, {
          onSuccess: () => message.success("Đã xoá pack"),
          onError: (err: Error) => message.error(err.message || "Xoá thất bại"),
        });
      },
    });
  };

  const hasFilters = Boolean(params.search || params.status);

  return (
    <div>
      <Typography.Title level={3}>Learning Pack</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Input.Search
                placeholder="Tìm tên pack"
                allowClear
                value={filterValues.search}
                onChange={(e) => handleFilterChange({ ...filterValues, search: e.target.value })}
                onSearch={(value) => handleFilterChange({ ...filterValues, search: value })}
                style={{ width: 240 }}
              />
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["pack.manage"]}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
                  Tạo pack
                </Button>
              </Can>
            </Space>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách pack"
              description={error?.message}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {isLoading && !data ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : (
            <PackTable
              data={data?.items ?? []}
              loading={isLoading}
              pagination={{
                current: params.page,
                pageSize: params.pageSize,
                total: data?.total ?? 0,
              }}
              onChange={handleTableChange}
              onDelete={handleDelete}
            />
          )}

          {!isLoading && !isError && data?.items.length === 0 && (
            <Empty description={hasFilters ? "Không tìm thấy pack phù hợp" : "Chưa có pack nào"}>
              {hasFilters && (
                <Button
                  onClick={() => setSearchParams(buildSearchParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE }))}
                >
                  Xoá filter
                </Button>
              )}
            </Empty>
          )}
        </Space>
      </Card>

      <PackFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={createPack.isPending}
      />
    </div>
  );
}
