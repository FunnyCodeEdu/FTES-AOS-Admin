import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Empty, Input, Skeleton, Select, Space, Tooltip, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { TableProps } from "antd";

import { Can } from "../../../../shared/permissions";
import { adminErrorMessage } from "../../../../shared/api/errors";
import type { Course, CourseFilterFormValues, CourseListParams, CourseStatus, CourseType } from "../../types";
import { SubjectSelect } from "../../components/SubjectSelect";
import { courseUpdatePayload, useCourses, useCreateCourse, useDeleteCourse, useUpdateCourse } from "../api/courses.api";
import { CourseFormModal } from "../components/CourseFormModal";
import { CourseTable } from "../components/CourseTable";
import { GrantEnrollmentModal } from "../components/GrantEnrollmentModal";
import { DeleteConfirmModal } from "../../../../shared/components/DeleteConfirmModal";
import { useIsMobile } from "../../../../shared/hooks/useIsMobile";
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
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse(editingCourse?.id);
  const deleteCourse = useDeleteCourse();

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

  const isMobile = useIsMobile();

  // Ô tìm giữ chữ đang gõ ở state riêng rồi mới đẩy vào URL sau 400ms: đẩy thẳng mỗi phím sẽ ghi
  // lịch sử router và gọi API theo từng ký tự.
  const [searchText, setSearchText] = useState(params.search ?? "");
  const searchTextRef = useRef(searchText);
  searchTextRef.current = searchText;

  useEffect(() => {
    // Đồng bộ ngược khi filter bị xoá từ ngoài (nút "Xoá filter"), nhưng KHÔNG đè lên chữ người
    // dùng đang gõ dở.
    const next = params.search ?? "";
    if (next !== searchTextRef.current.trim()) setSearchText(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search]);

  const handleFilterChange = (values: CourseFilterFormValues) => {
    setSearchParams(buildSearchParams({ ...params, ...values, page: 1 }));
  };

  useEffect(() => {
    const trimmed = searchText.trim();
    const current = params.search ?? "";
    if (trimmed === current) return;
    const timer = setTimeout(
      () => handleFilterChange({ ...filterValues, search: trimmed || undefined }),
      400
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

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
    const callbacks = {
      onSuccess: () => {
        message.success(editingCourse ? "Đã cập nhật khoá học" : "Đã tạo khoá học");
        setFormOpen(false);
        setEditingCourse(null);
      },
      // adminErrorMessage: mã BE (COURSE_TYPE_DOWNGRADE_FORBIDDEN…) → câu tiếng Việt dễ hiểu.
      onError: (err: Error) => message.error(adminErrorMessage(err)),
    };
    if (editingCourse) {
      // courseUpdatePayload: chỉ gửi saleMode khi admin thật sự đổi type (tránh dính guard oan).
      updateCourse.mutate(courseUpdatePayload(values, editingCourse), callbacks);
    } else {
      createCourse.mutate(values, callbacks);
    }
  };

  const hasFilters = Boolean(
    params.search || params.subjectId || params.status || params.courseType || params.lecturerId
  );

  return (
    <div>
      <Typography.Title level={3}>Khoá học</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space
            wrap
            direction={isMobile ? "vertical" : "horizontal"}
            style={{ justifyContent: "space-between", width: "100%" }}
            styles={isMobile ? { item: { width: "100%" } } : undefined}
          >
            <Space
              wrap
              direction={isMobile ? "vertical" : "horizontal"}
              style={isMobile ? { width: "100%" } : undefined}
              styles={isMobile ? { item: { width: "100%" } } : undefined}
            >
              {/* Tìm khoá học theo tên — plumbing (params.search → filter `q` → BE) đã có sẵn.
                  Lọc dần theo từng chữ (chờ 400ms) thay vì bắt bấm Enter: trên điện thoại, bấm nút
                  tìm nghĩa là mở bàn phím, gõ, đóng bàn phím, rồi mới thấy kết quả. */}
              <Input
                allowClear
                size="large"
                prefix={<SearchOutlined />}
                placeholder="Tìm khoá học theo tên..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={isMobile ? { width: "100%" } : { minWidth: 260, maxWidth: 340 }}
              />
              {/* Lọc theo trạng thái — plumbing (params.status → filter `status` uppercase → BE) đã có sẵn.
                  "published" = khoá đang hoạt động (active). */}
              <Select
                placeholder="Trạng thái"
                allowClear
                value={filterValues.status}
                onChange={(value) => handleFilterChange({ ...filterValues, status: value })}
                style={isMobile ? { width: "100%" } : { minWidth: 150 }}
                options={[
                  { value: "published", label: "Đã xuất bản" },
                  { value: "draft", label: "Nháp" },
                  { value: "review", label: "Chờ duyệt" },
                  { value: "archived", label: "Lưu trữ" },
                ]}
              />
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
                style={isMobile ? { width: "100%" } : { minWidth: 160 }}
                options={[
                  { value: "LEGACY", label: "LEGACY" },
                  { value: "PACKAGE", label: "PACKAGE" },
                ]}
              />
            </Space>
            <Space
              style={isMobile ? { width: "100%" } : undefined}
              styles={isMobile ? { item: { flex: 1 } } : undefined}
            >
              <Button block={isMobile} icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["course.create"]}>
                <Button
                  type="primary"
                  block={isMobile}
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
              onDelete={(course) => setDeletingCourse(course)}
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

      <DeleteConfirmModal
        open={!!deletingCourse}
        title="Xoá khoá học"
        description={
          <>
            Xoá <strong>{deletingCourse?.name}</strong> là <strong>vĩnh viễn, không hoàn tác</strong>.
            Cân nhắc "Gỡ xuất bản" nếu chỉ muốn ẩn tạm.
          </>
        }
        loading={deleteCourse.isPending}
        onConfirm={(reason) => {
          if (!deletingCourse) return;
          deleteCourse.mutate(
            { id: deletingCourse.id, reason },
            {
              onSuccess: () => {
                message.success("Đã xoá khoá học");
                setDeletingCourse(null);
              },
            }
          );
        }}
        onCancel={() => setDeletingCourse(null)}
      />
    </div>
  );
}
