import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
  Typography,
  message,
} from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import { ApiError } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type { CategoryFormValues, CourseCategory } from "../types";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "../api/categories.api";
import { CategoryTable } from "../components/CategoryTable";
import { CategoryFormModal } from "../components/CategoryFormModal";

const DEFAULT_PAGE_SIZE = 10;

export default function CategoryListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = useCategories();

  const [form] = Form.useForm<CategoryFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseCategory | null>(null);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory(editing?.id);
  const deleteCategory = useDeleteCategory();

  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [data, search]);

  const pageItems = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  const handleTableChange: TableProps<CourseCategory>["onChange"] = (pagination) => {
    updateParams({
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? DEFAULT_PAGE_SIZE,
    });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleSubmit = (values: CategoryFormValues) => {
    const mutation = editing ? updateCategory : createCategory;
    mutation.mutate(values, {
      onSuccess: () => {
        message.success(editing ? "Đã cập nhật danh mục" : "Đã tạo danh mục");
        closeForm();
      },
      onError: (err) => {
        if (err instanceof ApiError && err.errorCode === "SLUG_TAKEN") {
          form.setFields([{ name: "slug", errors: ["Slug đã tồn tại, vui lòng chọn slug khác."] }]);
          return;
        }
        handleAdminMutationError(err);
      },
    });
  };

  const handleDelete = (category: CourseCategory) => {
    Modal.confirm({
      title: "Xoá danh mục",
      content: (
        <>
          Bạn chuẩn bị xoá danh mục <strong>{category.name}</strong>. Danh mục còn khoá học sẽ
          không xoá được.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        deleteCategory.mutate(category.id, {
          onSuccess: () => message.success("Đã xoá danh mục"),
          onError: (err) => {
            const code = err instanceof ApiError ? err.code : undefined;
            const errorCode = err instanceof ApiError ? err.errorCode : undefined;
            if (code === 409 || errorCode === "COURSE_CATEGORY_IN_USE") {
              message.error("Danh mục còn khoá học, không thể xoá");
            } else {
              message.error(err.message || "Xoá thất bại");
            }
          },
        });
      },
    });
  };

  return (
    <div>
      <Typography.Title level={3}>Danh mục khoá học</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm theo tên hoặc slug"
              defaultValue={search}
              allowClear
              onChange={(e) => updateParams({ search: e.target.value || undefined, page: undefined })}
              style={{ width: 260 }}
            />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["course.category.manage"]}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Tạo danh mục
                </Button>
              </Can>
            </Space>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh mục khoá học"
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
            <CategoryTable
              data={pageItems}
              loading={isLoading}
              pagination={{ current: page, pageSize, total: filtered.length }}
              onChange={handleTableChange}
              onEdit={(category) => {
                setEditing(category);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <Empty description={search ? "Không tìm thấy danh mục phù hợp" : "Chưa có danh mục nào"} />
          )}
        </Space>
      </Card>

      <CategoryFormModal
        open={formOpen}
        category={editing}
        form={form}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isSubmitting={createCategory.isPending || updateCategory.isPending}
      />
    </div>
  );
}
