import { useMemo } from "react";
import { Alert, Button, Card, Empty, Skeleton, Space, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { Can } from "../../../shared/permissions";
import { useUsers } from "../api/users.api";
import { ExportButton } from "../components/ExportButton";
import { UserFilters } from "../components/UserFilters";
import { UserTable } from "../components/UserTable";
import type { UserFilterFormValues, UserListParams } from "../types";

const DEFAULT_PAGE_SIZE = 10;

function parseParams(searchParams: URLSearchParams): UserListParams {
  return {
    search: searchParams.get("search") || undefined,
    role: searchParams.get("role") || undefined,
    status: searchParams.get("status") || undefined,
    campus: searchParams.get("campus") || undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10),
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
  };
}

function buildSearchParams(values: UserListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (values.search) params.set("search", values.search);
  if (values.role) params.set("role", values.role);
  if (values.status) params.set("status", values.status);
  if (values.campus) params.set("campus", values.campus);
  params.set("page", String(values.page));
  params.set("pageSize", String(values.pageSize));
  if (values.sortBy) params.set("sortBy", values.sortBy);
  if (values.sortOrder) params.set("sortOrder", values.sortOrder);
  return params;
}

export default function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const { data, isLoading, isError, error, refetch } = useUsers(params);

  const filterValues: UserFilterFormValues = useMemo(
    () => ({
      search: params.search,
      role: params.role,
      status: params.status,
      campus: params.campus,
    }),
    [params]
  );

  const handleFilterChange = (values: UserFilterFormValues) => {
    setSearchParams(buildSearchParams({ ...params, ...values, page: 1 }));
  };

  const handleTableChange: NonNullable<import("antd").TableProps<import("../types").UserRow>["onChange"]> = (
    pagination,
    _filters,
    sorter
  ) => {
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

  const hasFilters = Boolean(params.search || params.role || params.status || params.campus);

  return (
    <div>
      <Typography.Title level={3}>Người dùng</Typography.Title>
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <UserFilters values={filterValues} onChange={handleFilterChange} />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["user.export"]}>
                <ExportButton filters={params} />
              </Can>
            </Space>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách user"
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
            <UserTable
              data={data?.items ?? []}
              loading={isLoading}
              pagination={{
                current: params.page,
                pageSize: params.pageSize,
                total: data?.total ?? 0,
              }}
              onChange={handleTableChange}
            />
          )}

          {!isLoading && !isError && data?.items.length === 0 && (
            <Empty
              description={hasFilters ? "Không tìm thấy user phù hợp" : "Chưa có user nào"}
            >
              {hasFilters && (
                <Button onClick={() => setSearchParams(buildSearchParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE }))}>
                  Xoá filter
                </Button>
              )}
            </Empty>
          )}
        </Space>
      </Card>
    </div>
  );
}
