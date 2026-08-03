import { useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Input, Modal, Select, Skeleton, Space, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import type { TermStatus, TermView } from "../../types";
import { useDeleteTerm, useTerms } from "../api/terms.api";
import { TermFormModal } from "../components/TermFormModal";
import { TermTable } from "../components/TermTable";

/**
 * Danh sách kỳ học. Endpoint `GET /terms` trả toàn bộ `TermView[]` (không phân trang server) →
 * search + lọc trạng thái thực hiện client-side, bảng phân trang client-side.
 */
export default function TermListPage() {
  const { data, isLoading, isError, error, refetch } = useTerms();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TermStatus | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermView | null>(null);

  const deleteTerm = useDeleteTerm();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      const matchesSearch =
        !term ||
        t.code.toLowerCase().includes(term) ||
        t.name.toLowerCase().includes(term);
      const matchesStatus = !status || t.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, status]);

  const hasFilters = Boolean(search.trim() || status);

  const handleDelete = (term: TermView) => {
    Modal.confirm({
      title: "Xoá kỳ học",
      content: (
        <>
          Bạn chuẩn bị xoá kỳ <strong>{term.name}</strong> ({term.code}). Thao tác này không thể
          hoàn tác.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () =>
        deleteTerm.mutateAsync(term.id).then(() => {
          message.success("Đã xoá kỳ học");
        }),
    });
  };

  return (
    <div>
      <Typography.Title level={3}>Kỳ học</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Input.Search
                placeholder="Tìm mã / tên kỳ"
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 240 }}
              />
              <Select
                placeholder="Trạng thái"
                allowClear
                value={status}
                onChange={(value) => setStatus(value as TermStatus | undefined)}
                options={[
                  { value: "SCHEDULED", label: "Sắp diễn ra" },
                  { value: "ACTIVE", label: "Đang diễn ra" },
                  { value: "ENDED", label: "Đã kết thúc" },
                ]}
                style={{ width: 160 }}
              />
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["term.manage"]}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingTerm(null);
                    setFormOpen(true);
                  }}
                >
                  Tạo kỳ
                </Button>
              </Can>
            </Space>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách kỳ học"
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
            <TermTable
              data={filtered}
              loading={isLoading}
              onEdit={(term) => {
                setEditingTerm(term);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <Empty
              description={hasFilters ? "Không tìm thấy kỳ học phù hợp" : "Chưa có kỳ học nào"}
            >
              {hasFilters && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setStatus(undefined);
                  }}
                >
                  Xoá filter
                </Button>
              )}
            </Empty>
          )}
        </Space>
      </Card>

      <TermFormModal
        open={formOpen}
        term={editingTerm}
        onClose={() => {
          setFormOpen(false);
          setEditingTerm(null);
        }}
      />
    </div>
  );
}
