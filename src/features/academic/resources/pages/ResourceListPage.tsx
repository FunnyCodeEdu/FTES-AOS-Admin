import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Modal, Skeleton, Space, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import { ApiError } from "../../../../shared/api/client";
import type { Resource, ResourceFilterFormValues, ResourceListParams } from "../../types";
import { ScopePicker } from "../../components/ScopePicker";
import { useCtvScopeStore } from "../../store/ctvScopeStore";
import { useCreateResource, useDeleteResource, useResources, useUpdateResource } from "../api/resources.api";
import { ResourceFilters } from "../components/ResourceFilters";
import { ResourceFormModal } from "../components/ResourceFormModal";
import { ResourceTable } from "../components/ResourceTable";
import type { ResourceFormValues } from "../../types";

const DEFAULT_PAGE_SIZE = 10;

function parseParams(searchParams: URLSearchParams): ResourceListParams {
  return {
    subjectId: searchParams.get("subjectId") || undefined,
    type: (searchParams.get("type") as ResourceListParams["type"]) || undefined,
    status: (searchParams.get("status") as ResourceListParams["status"]) || undefined,
    search: searchParams.get("search") || undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10),
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
  };
}

function buildSearchParams(values: ResourceListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (values.subjectId) params.set("subjectId", values.subjectId);
  if (values.type) params.set("type", values.type);
  if (values.status) params.set("status", values.status);
  if (values.search) params.set("search", values.search);
  params.set("page", String(values.page));
  params.set("pageSize", String(values.pageSize));
  if (values.sortBy) params.set("sortBy", values.sortBy);
  if (values.sortOrder) params.set("sortOrder", values.sortOrder);
  return params;
}

export default function ResourceListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const scopes = useCtvScopeStore((s) => s.scopes);
  const activeScopeId = useCtvScopeStore((s) => s.activeScopeId);
  const isCtv = scopes.length > 0;

  // Pin resource list to active subject scope for CTV
  useEffect(() => {
    if (isCtv && activeScopeId && params.subjectId !== activeScopeId) {
      setSearchParams(buildSearchParams({ ...params, subjectId: activeScopeId, page: 1 }));
    }
  }, [isCtv, activeScopeId, params, setSearchParams]);

  const { data, isLoading, isError, error, refetch } = useResources(params);

  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const createResource = useCreateResource();
  const updateResource = useUpdateResource(editingResource?.id);
  const deleteResource = useDeleteResource();

  const filterValues: ResourceFilterFormValues = useMemo(
    () => ({
      subjectId: params.subjectId,
      type: params.type,
      status: params.status,
      search: params.search,
    }),
    [params]
  );

  const handleFilterChange = (values: ResourceFilterFormValues) => {
    setSearchParams(buildSearchParams({ ...params, ...values, page: 1 }));
  };

  const handleTableChange: TableProps<Resource>["onChange"] = (pagination, _filters, sorter) => {
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

  const handleSubmit = (values: ResourceFormValues) => {
    const mutation = editingResource ? updateResource : createResource;
    mutation.mutate(
      { ...values, subjectId: isCtv && activeScopeId ? activeScopeId : values.subjectId },
      {
        onSuccess: () => {
          message.success(editingResource ? "Đã cập nhật học liệu" : "Đã upload học liệu");
          setFormOpen(false);
          setEditingResource(null);
        },
        onError: (err: Error) => message.error(err.message || "Thao tác thất bại"),
      }
    );
  };

  const handleDelete = (resource: Resource) => {
    Modal.confirm({
      title: "Xoá học liệu",
      content: (
        <>
          Xoá <strong>{resource.title}</strong> sẽ khiến học viên mất quyền truy cập vào nội dung này.
          Thao tác không thể hoàn tác và được ghi audit.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        deleteResource.mutate(resource.id, {
          onSuccess: () => message.success("Đã xoá học liệu"),
          onError: (err: Error) => {
            const code = err instanceof ApiError ? err.code : undefined;
            message.error(code === 403 ? "Không có quyền xoá" : err.message || "Xoá thất bại");
          },
        });
      },
    });
  };

  const hasFilters = Boolean(params.subjectId || params.type || params.status || params.search);

  return (
    <div>
      <Typography.Title level={3}>Học liệu</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <ResourceFilters
              values={filterValues}
              onChange={handleFilterChange}
              subjectLocked={isCtv}
            />
            <Space>
              <ScopePicker />
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["resource.upload"]}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingResource(null);
                    setFormOpen(true);
                  }}
                >
                  Upload học liệu
                </Button>
              </Can>
            </Space>
          </Space>

          {isCtv && (
            <Alert
              type="info"
              showIcon
              message="Chế độ CTV"
              description="Bạn chỉ thấy học liệu thuộc môn được gán."
            />
          )}

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách học liệu"
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
            <ResourceTable
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
            <Empty
              description={hasFilters ? "Không tìm thấy học liệu phù hợp" : "Chưa có học liệu nào"}
            >
              {hasFilters && (
                <Button
                  onClick={() =>
                    setSearchParams(
                      buildSearchParams({
                        page: 1,
                        pageSize: DEFAULT_PAGE_SIZE,
                        subjectId: isCtv && activeScopeId ? activeScopeId : undefined,
                      })
                    )
                  }
                >
                  Xoá filter
                </Button>
              )}
            </Empty>
          )}
        </Space>
      </Card>

      <ResourceFormModal
        open={formOpen}
        resource={editingResource}
        onClose={() => {
          setFormOpen(false);
          setEditingResource(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={createResource.isPending || updateResource.isPending}
        subjectLocked={isCtv}
      />
    </div>
  );
}
