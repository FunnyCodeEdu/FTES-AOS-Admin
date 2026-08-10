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
import type { Campus, CampusFormValues } from "../types";
import {
  useCampuses,
  useCreateCampus,
  useDeleteCampus,
  useUpdateCampus,
} from "../api/campuses.api";
import { CampusTable } from "../components/CampusTable";
import { CampusFormModal } from "../components/CampusFormModal";

const DEFAULT_PAGE_SIZE = 10;

export default function CampusListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = useCampuses();

  const [form] = Form.useForm<CampusFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campus | null>(null);

  const createCampus = useCreateCampus();
  const updateCampus = useUpdateCampus(editing?.id);
  const deleteCampus = useDeleteCampus();

  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.nameEn ?? "").toLowerCase().includes(q)
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

  const handleTableChange: TableProps<Campus>["onChange"] = (pagination) => {
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

  const handleSubmit = (values: CampusFormValues) => {
    const mutation = editing ? updateCampus : createCampus;
    mutation.mutate(values, {
      onSuccess: () => {
        message.success(editing ? "Đã cập nhật cơ sở" : "Đã tạo cơ sở");
        closeForm();
      },
      onError: (err) => {
        const errorCode = err instanceof ApiError ? err.errorCode : undefined;
        const code = err instanceof ApiError ? err.code : undefined;
        if (errorCode === "COMMUNITY_CAMPUS_CODE_EXISTS" || code === 409) {
          form.setFields([{ name: "code", errors: ["Mã cơ sở đã tồn tại, vui lòng chọn mã khác."] }]);
          return;
        }
        handleAdminMutationError(err);
      },
    });
  };

  const handleDelete = (campus: Campus) => {
    Modal.confirm({
      title: "Xoá cơ sở",
      content: (
        <>
          Bạn chuẩn bị xoá cơ sở <strong>{campus.name}</strong>. Bài viết đang gắn cơ sở này sẽ
          không còn tham chiếu hợp lệ.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        deleteCampus.mutate(campus.id, {
          onSuccess: () => message.success("Đã xoá cơ sở"),
          onError: (err) => handleAdminMutationError(err),
        });
      },
    });
  };

  return (
    <div>
      <Typography.Title level={3}>Cơ sở cộng đồng</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm theo mã hoặc tên"
              defaultValue={search}
              allowClear
              onChange={(e) => updateParams({ search: e.target.value || undefined, page: undefined })}
              style={{ width: 260 }}
            />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["community.campus.manage"]}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Tạo cơ sở
                </Button>
              </Can>
            </Space>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách cơ sở"
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
            <CampusTable
              data={pageItems}
              loading={isLoading}
              pagination={{ current: page, pageSize, total: filtered.length }}
              onChange={handleTableChange}
              onEdit={(campus) => {
                setEditing(campus);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <Empty description={search ? "Không tìm thấy cơ sở phù hợp" : "Chưa có cơ sở nào"} />
          )}
        </Space>
      </Card>

      <CampusFormModal
        open={formOpen}
        campus={editing}
        form={form}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isSubmitting={createCampus.isPending || updateCampus.isPending}
      />
    </div>
  );
}
