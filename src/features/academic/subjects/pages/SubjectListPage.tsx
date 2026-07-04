import { useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Modal, Skeleton, Space, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import { ApiError } from "../../../../shared/api/client";
import type { Subject, SubjectFilterFormValues, SubjectListParams } from "../../types";
import { useCreateSubject, useDeleteSubject, useSubjects, useUpdateSubject } from "../api/subjects.api";
import { SubjectFilters } from "../components/SubjectFilters";
import { SubjectFormModal } from "../components/SubjectFormModal";
import { SubjectTable } from "../components/SubjectTable";
import type { SubjectFormValues } from "../../types";

const DEFAULT_PAGE_SIZE = 10;

function parseParams(searchParams: URLSearchParams): SubjectListParams {
  return {
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as SubjectListParams["status"]) || undefined,
    lecturerId: searchParams.get("lecturerId") || undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10),
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
  };
}

function buildSearchParams(values: SubjectListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (values.search) params.set("search", values.search);
  if (values.status) params.set("status", values.status);
  if (values.lecturerId) params.set("lecturerId", values.lecturerId);
  params.set("page", String(values.page));
  params.set("pageSize", String(values.pageSize));
  if (values.sortBy) params.set("sortBy", values.sortBy);
  if (values.sortOrder) params.set("sortOrder", values.sortOrder);
  return params;
}

export default function SubjectListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const { data, isLoading, isError, error, refetch } = useSubjects(params);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject(editingSubject?.id);
  const deleteSubject = useDeleteSubject();

  const filterValues: SubjectFilterFormValues = useMemo(
    () => ({
      search: params.search,
      status: params.status,
      lecturerId: params.lecturerId,
    }),
    [params]
  );

  const handleFilterChange = (values: SubjectFilterFormValues) => {
    setSearchParams(buildSearchParams({ ...params, ...values, page: 1 }));
  };

  const handleTableChange: TableProps<Subject>["onChange"] = (pagination, _filters, sorter) => {
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

  const handleSubmit = (values: SubjectFormValues) => {
    const mutation = editingSubject ? updateSubject : createSubject;
    mutation.mutate(values, {
      onSuccess: () => {
        message.success(editingSubject ? "Đã cập nhật môn học" : "Đã tạo môn học");
        setFormOpen(false);
        setEditingSubject(null);
      },
      onError: (err: Error) => {
        message.error(err.message || "Thao tác thất bại");
      },
    });
  };

  const handleDelete = (subject: Subject) => {
    Modal.confirm({
      title: "Xoá môn học",
      content: (
        <>
          Bạn chuẩn bị xoá <strong>{subject.name}</strong>. Thao tác này không thể hoàn tác.
          Nếu môn còn khoá học hoặc học liệu tham chiếu, hệ thống sẽ từ chối.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        deleteSubject.mutate(subject.id, {
          onSuccess: () => message.success("Đã xoá môn học"),
          onError: (err: Error) => {
            const code = err instanceof ApiError ? err.code : undefined;
            if (code === 409) {
              message.error("Không thể xoá: môn học còn được tham chiếu bởi khoá học hoặc học liệu.");
            } else {
              message.error(err.message || "Xoá thất bại");
            }
          },
        });
      },
    });
  };

  const hasFilters = Boolean(params.search || params.status || params.lecturerId);

  return (
    <div>
      <Typography.Title level={3}>Môn học</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <SubjectFilters values={filterValues} onChange={handleFilterChange} />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["subject.create"]}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingSubject(null);
                    setFormOpen(true);
                  }}
                >
                  Tạo môn học
                </Button>
              </Can>
            </Space>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách môn học"
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
            <SubjectTable
              data={data?.items ?? []}
              loading={isLoading}
              pagination={{
                current: params.page,
                pageSize: params.pageSize,
                total: data?.total ?? 0,
              }}
              onChange={handleTableChange}
              onEdit={(subject) => {
                setEditingSubject(subject);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {!isLoading && !isError && data?.items.length === 0 && (
            <Empty
              description={hasFilters ? "Không tìm thấy môn học phù hợp" : "Chưa có môn học nào"}
            >
              {hasFilters && (
                <Button
                  onClick={() =>
                    setSearchParams(buildSearchParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE }))
                  }
                >
                  Xoá filter
                </Button>
              )}
            </Empty>
          )}
        </Space>
      </Card>

      <SubjectFormModal
        open={formOpen}
        subject={editingSubject}
        onClose={() => {
          setFormOpen(false);
          setEditingSubject(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={createSubject.isPending || updateSubject.isPending}
      />
    </div>
  );
}
