import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
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
import { useTerms } from "../../terms/api/terms.api";
import { TermStatusTag } from "../../terms/components/TermStatusTag";
import { buildGoldenBoardPayload } from "../payload";
import { pickDefaultTermId, sortTermsForPicker } from "../termSelection";
import {
  resolvedDisplayName,
  type GoldenBoardEntry,
  type GoldenBoardEntryFormValues,
} from "../types";
import {
  useCreateGoldenBoardEntry,
  useDeleteGoldenBoardEntry,
  useGoldenBoardEntries,
  useUpdateGoldenBoardEntry,
} from "../api/goldenBoard.api";
import { GoldenBoardTable } from "../components/GoldenBoardTable";
import { GoldenBoardEntryFormModal } from "../components/GoldenBoardEntryFormModal";

const DEFAULT_PAGE_SIZE = 10;

/**
 * Console Bảng vàng (course-golden-board). Cả trang neo theo MỘT kỳ học: bảng là dữ liệu của kỳ,
 * nên picker kỳ đứng trên cùng và mọi thao tác đều thuộc kỳ đang chọn (giữ ở query param `term`
 * để reload/chia sẻ link vẫn về đúng kỳ).
 *
 * Nguồn kỳ là `/api/v1/admin/terms` (leaf `term.view`) chứ KHÔNG phải đường công khai
 * `/api/v1/golden-board/terms` — đường công khai chỉ trả các kỳ ĐÃ CÓ bảng, mà việc đầu tiên của
 * admin lại là soạn bảng cho kỳ CHƯA có dòng nào. V322 grant `goldenboard.manage` đúng bộ role
 * đang giữ `term.view`/`term.manage` (ADMIN/SUPER_ADMIN/ADMIN_ACADEMIC) nên ai vào được trang này
 * cũng đọc được danh sách kỳ.
 */
export default function GoldenBoardListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: terms,
    isLoading: termsLoading,
    isError: termsError,
    error: termsErrorObj,
    refetch: refetchTerms,
  } = useTerms();

  const termOptions = useMemo(() => sortTermsForPicker(terms ?? []), [terms]);
  const paramTermId = searchParams.get("term") ?? undefined;
  // Param có thể trỏ tới kỳ đã bị xoá — rơi về kỳ mặc định thay vì gọi API với id rác.
  const termId =
    (paramTermId && termOptions.some((t) => t.id === paramTermId) ? paramTermId : undefined) ??
    pickDefaultTermId(termOptions);
  const selectedTerm = termOptions.find((t) => t.id === termId);

  const { data, isLoading, isError, error, refetch } = useGoldenBoardEntries(termId);

  const [form] = Form.useForm<GoldenBoardEntryFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoldenBoardEntry | null>(null);

  const createEntry = useCreateGoldenBoardEntry(termId);
  const updateEntry = useUpdateGoldenBoardEntry(editing?.id, termId);
  const deleteEntry = useDeleteGoldenBoardEntry(termId);

  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (e) =>
        resolvedDisplayName(e).toLowerCase().includes(q) ||
        (e.headline ?? "").toLowerCase().includes(q) ||
        (e.badgeLabel ?? "").toLowerCase().includes(q) ||
        (e.linkedUsername ?? "").toLowerCase().includes(q)
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

  const handleTableChange: TableProps<GoldenBoardEntry>["onChange"] = (pagination) => {
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

  const handleSubmit = (values: GoldenBoardEntryFormValues) => {
    const mutation = editing ? updateEntry : createEntry;
    mutation.mutate(buildGoldenBoardPayload(values, editing), {
      onSuccess: () => {
        message.success(editing ? "Đã cập nhật dòng bảng vàng" : "Đã thêm dòng bảng vàng");
        closeForm();
      },
      onError: (err) => {
        const errorCode = err instanceof ApiError ? err.errorCode : undefined;
        const code = err instanceof ApiError ? err.code : undefined;
        // Unique bộ phận (term_id, user_id): một tài khoản chỉ một dòng trong một kỳ. Gắn lỗi lên
        // đúng ô tài khoản thay vì ném notification chung — người sửa mới biết phải đổi ô nào.
        if (errorCode === "GOLDEN_BOARD_DUPLICATE_USER" || code === 409) {
          form.setFields([
            {
              name: "userId",
              errors: ["Tài khoản này đã có mặt trên bảng vàng của kỳ — mỗi người chỉ một dòng."],
            },
          ]);
          return;
        }
        handleAdminMutationError(err);
      },
    });
  };

  const handleDelete = (entry: GoldenBoardEntry) => {
    Modal.confirm({
      title: "Xoá dòng bảng vàng",
      content: (
        <>
          Bạn chuẩn bị xoá <strong>{resolvedDisplayName(entry)}</strong> khỏi bảng vàng kỳ{" "}
          <strong>{selectedTerm?.code ?? termId}</strong>. Nếu chỉ muốn tạm ẩn khỏi trang chủ, hãy
          dùng công tắc “Hiện trên bảng” thay vì xoá.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        deleteEntry.mutate(entry.id, {
          onSuccess: () => message.success("Đã xoá dòng bảng vàng"),
          onError: (err) => handleAdminMutationError(err),
        });
      },
    });
  };

  return (
    <div>
      <Typography.Title level={3}>Bảng vàng</Typography.Title>
      <Typography.Paragraph type="secondary">
        Bục vinh danh hiển thị ở trang chủ, soạn theo từng kỳ học. Trang chủ hiện bảng của kỳ mới
        nhất; dòng đã ẩn không lên trang chủ nhưng vẫn nằm ở đây.
      </Typography.Paragraph>

      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Select
                value={termId}
                loading={termsLoading}
                style={{ width: 320 }}
                placeholder="Chọn kỳ học"
                showSearch
                optionFilterProp="label"
                onChange={(value: string) => updateParams({ term: value, page: undefined })}
                options={termOptions.map((t) => ({
                  value: t.id,
                  label: `${t.code} — ${t.name}`,
                }))}
                optionRender={(option) => {
                  const term = termOptions.find((t) => t.id === option.value);
                  return (
                    <Space>
                      <span>{option.label}</span>
                      {term && <TermStatusTag status={term.status} />}
                    </Space>
                  );
                }}
              />
              {selectedTerm && <TermStatusTag status={selectedTerm.status} />}
              <Input
                prefix={<SearchOutlined />}
                placeholder="Tìm theo tên, giới thiệu, chip"
                defaultValue={search}
                allowClear
                onChange={(e) =>
                  updateParams({ search: e.target.value || undefined, page: undefined })
                }
                style={{ width: 260 }}
              />
            </Space>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  refetchTerms();
                  if (termId) refetch();
                }}
              >
                Làm mới
              </Button>
              <Can permissions={["goldenboard.manage"]}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={!termId}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Thêm dòng
                </Button>
              </Can>
            </Space>
          </Space>

          {termsError && (
            <Alert
              type="error"
              message="Không thể tải danh sách kỳ học"
              description={termsErrorObj?.message}
              action={
                <Button size="small" onClick={() => refetchTerms()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {isError && (
            <Alert
              type="error"
              message="Không thể tải bảng vàng của kỳ này"
              description={error?.message}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {!termsLoading && termOptions.length === 0 ? (
            <Empty description="Chưa có kỳ học nào — hãy tạo kỳ ở màn Kỳ học trước khi soạn bảng vàng." />
          ) : termsLoading || (isLoading && !data) ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : (
            <GoldenBoardTable
              data={pageItems}
              loading={isLoading}
              pagination={{ current: page, pageSize, total: filtered.length }}
              onChange={handleTableChange}
              onEdit={(entry) => {
                setEditing(entry);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {!termsLoading && termOptions.length > 0 && !isLoading && !isError && filtered.length === 0 && (
            <Empty
              description={
                search ? "Không tìm thấy dòng phù hợp" : "Kỳ này chưa có dòng bảng vàng nào"
              }
            />
          )}
        </Space>
      </Card>

      <GoldenBoardEntryFormModal
        open={formOpen}
        entry={editing}
        termLabel={selectedTerm ? `${selectedTerm.code} — ${selectedTerm.name}` : undefined}
        form={form}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isSubmitting={createEntry.isPending || updateEntry.isPending}
      />
    </div>
  );
}
