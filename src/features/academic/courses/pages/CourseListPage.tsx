import { useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Skeleton, Select, Space, Tooltip, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { TableProps } from "antd";

import { Can } from "../../../../shared/permissions";
import type { Course, CourseFilterFormValues, CourseListParams, CourseStatus, CourseType } from "../../types";
import { SubjectSelect } from "../../components/SubjectSelect";
import { useCourses, useCreateCourse, useUpdateCourse } from "../api/courses.api";
import { CourseFormModal } from "../components/CourseFormModal";
import { CourseTable } from "../components/CourseTable";
import { GrantEnrollmentModal } from "../components/GrantEnrollmentModal";
import type { CourseFormValues } from "../../types";

const DEFAULT_PAGE_SIZE = 10;

function parseParams(searchParams: URLSearchParams): CourseListParams {
  return {
    search: searchParams.get("search") || undefined,
    subjectId: searchParams.get("subjectId") || undefined,
    status: (searchParams.get("status") as CourseStatus) || undefined,
    courseType: (searchParams.get("courseType") as CourseType) || undefined,
    lecturerId: searchParams.get("lecturerId") || undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10),
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
  };
}

function buildSearchParams(values: CourseListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (values.search) params.set("search", values.search);
  if (values.subjectId) params.set("subjectId", values.subjectId);
  if (values.status) params.set("status", values.status);
  if (values.courseType) params.set("courseType", values.courseType);
  if (values.lecturerId) params.set("lecturerId", values.lecturerId);
  params.set("page", String(values.page));
  params.set("pageSize", String(values.pageSize));
  if (values.sortBy) params.set("sortBy", values.sortBy);
  if (values.sortOrder) params.set("sortOrder", values.sortOrder);
  return params;
}

export default function CourseListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const { data, isLoading, isError, error, refetch } = useCourses(params);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [grantCourse, setGrantCourse] = useState<Course | null>(null);

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse(editingCourse?.id);

  const filterValues: CourseFilterFormValues = useMemo(
    () => ({
      search: params.search,
      subjectId: params.subjectId,
      status: params.status,
      courseType: params.courseType,
      lecturerId: params.lecturerId,
    }),
    [params]
  );

  const handleFilterChange = (values: CourseFilterFormValues) => {
    setSearchParams(buildSearchParams({ ...params, ...values, page: 1 }));
  };

  const handleTableChange: TableProps<Course>["onChange"] = (pagination, _filters, sorter) => {
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

  const handleSubmit = (values: CourseFormValues) => {
    const mutation = editingCourse ? updateCourse : createCourse;
    mutation.mutate(values, {
      onSuccess: () => {
        message.success(editingCourse ? "Đã cập nhật khoá học" : "Đã tạo khoá học");
        setFormOpen(false);
        setEditingCourse(null);
      },
      onError: (err: Error) => message.error(err.message || "Thao tác thất bại"),
    });
  };

  const hasFilters = Boolean(
    params.search || params.subjectId || params.status || params.courseType || params.lecturerId
  );

  return (
    <div>
      <Typography.Title level={3}>Khoá học</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Tooltip title="sắp có">
                <span style={{ display: "inline-block" }}>
                  <SubjectSelect
                    value={filterValues.subjectId}
                    onChange={(value) => handleFilterChange({ ...filterValues, subjectId: value })}
                    placeholder="Môn học"
                    disabled
                  />
                </span>
              </Tooltip>
              <Select
                placeholder="Loại khoá học"
                allowClear
                value={filterValues.courseType}
                onChange={(value) => handleFilterChange({ ...filterValues, courseType: value })}
                style={{ minWidth: 160 }}
                options={[
                  { value: "LEGACY", label: "LEGACY" },
                  { value: "PACKAGE", label: "PACKAGE" },
                ]}
              />
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["course.create"]}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingCourse(null);
                    setFormOpen(true);
                  }}
                >
                  Tạo khoá học
                </Button>
              </Can>
            </Space>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách khoá học"
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
            <CourseTable
              data={data?.items ?? []}
              loading={isLoading}
              pagination={{
                current: params.page,
                pageSize: params.pageSize,
                total: data?.total ?? 0,
              }}
              onChange={handleTableChange}
              onEdit={(course) => {
                setEditingCourse(course);
                setFormOpen(true);
              }}
              onGrant={(course) => setGrantCourse(course)}
            />
          )}

          {!isLoading && !isError && data?.items.length === 0 && (
            <Empty
              description={hasFilters ? "Không tìm thấy khoá học phù hợp" : "Chưa có khoá học nào"}
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

      <CourseFormModal
        open={formOpen}
        course={editingCourse}
        onClose={() => {
          setFormOpen(false);
          setEditingCourse(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={createCourse.isPending || updateCourse.isPending}
      />

      <GrantEnrollmentModal
        open={!!grantCourse}
        course={grantCourse}
        onClose={() => setGrantCourse(null)}
      />
    </div>
  );
}
