import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Typography,
  message,
} from "antd";
import { CheckOutlined, ReloadOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { RESOURCE_TYPE_OPTIONS } from "../../resources/constants";
import { useSubjects } from "../../subjects/api/subjects.api";
import type { BulkApproveResult, PendingResourceSummary, ResourceType } from "../../types";
import {
  useApproveResource,
  useBulkApproveResources,
  useModerationQueue,
  useRejectResource,
} from "../api/moderation.api";
import { BulkApproveResultModal } from "../components/BulkApproveResultModal";
import { ModerationQueueTable, type RowBusyState } from "../components/ModerationQueueTable";
import { RejectResourceModal } from "../components/RejectResourceModal";
import { ResourceModerationDetailDrawer } from "../components/ResourceModerationDetailDrawer";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Hàng đợi duyệt học liệu tập trung (`/academic/moderation`).
 *
 * Nguồn: `GET /api/v1/resources/moderation/pending` — đã scope sẵn phía server theo
 * `approvableSubjectIds()`. Vì thế trang này KHÔNG có picker môn và KHÔNG lọc lại theo môn:
 * approver toàn cục thấy toàn bộ tồn đọng, CTV theo môn thấy đúng môn của mình, người không có
 * phạm vi duyệt nhận trang rỗng (BE trả rỗng chứ không 403).
 *
 * Hệ quả: payload rỗng KHÔNG phân biệt được "hết việc" với "bạn không có phạm vi duyệt" — không có
 * field nào trong response để suy ra. Nên empty state dùng đúng một câu trung tính, không hứa hẹn
 * điều mà dữ liệu không nói.
 */
export default function ResourceModerationQueuePage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<PendingResourceSummary | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingResourceSummary | null>(null);
  const [busy, setBusy] = useState<RowBusyState | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkApproveResult | null>(null);

  const queue = useModerationQueue({ page, pageSize });
  const approve = useApproveResource();
  const reject = useRejectResource();
  const bulkApprove = useBulkApproveResources();

  // Hàng đợi chỉ trả `subjectId`. Tra tên môn từ chính nguồn `SubjectSelect` đang dùng.
  // CỐ Ý nuốt lỗi của query này: nó đi GraphQL `adminSubjects` và cần quyền đọc môn, mà người chỉ
  // có `resource.approve` có thể không có. Không tra được tên môn là bất tiện — không phải lý do
  // để chặn cả hàng đợi. Fallback: id rút gọn.
  const subjects = useSubjects({ page: 1, pageSize: 1000 });
  const subjectMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const subject of subjects.data?.items ?? []) {
      map.set(subject.id, `${subject.code} - ${subject.name}`);
    }
    return map;
  }, [subjects.data]);

  const subjectLabel = useCallback(
    (subjectId: string | null) => {
      if (!subjectId) return "—";
      return subjectMap.get(subjectId) ?? `${subjectId.slice(0, 8)}…`;
    },
    [subjectMap]
  );

  const items = queue.data?.items ?? [];

  // Lọc/tìm là CLIENT-SIDE trên đúng trang đang tải: endpoint chỉ nhận `page`/`size`, không có
  // tham số filter nào. UI nói rõ điều này để không ai tưởng vừa tìm toàn hệ.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = !typeFilter || item.type === typeFilter;
      if (!term) return matchesType;
      const haystack = `${item.title} ${subjectLabel(item.subjectId)}`.toLowerCase();
      return matchesType && haystack.includes(term);
    });
  }, [items, search, typeFilter, subjectLabel]);

  const hasFilters = Boolean(search.trim() || typeFilter);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  const handleApprove = (item: PendingResourceSummary) => {
    Modal.confirm({
      title: "Duyệt học liệu",
      content: (
        <>
          Duyệt <strong>{item.title}</strong>? Học liệu sẽ hiển thị với học viên theo phạm vi đã
          đặt. Quyết định được ghi vào audit log.
        </>
      ),
      okText: "Duyệt",
      cancelText: "Huỷ",
      onOk: async () => {
        setBusy({ id: item.id, action: "approve" });
        try {
          await approve.mutateAsync({ id: item.id });
          message.success("Đã duyệt học liệu");
          setPreviewItem((current) => (current?.id === item.id ? null : current));
          setSelectedIds((ids) => ids.filter((id) => id !== item.id));
        } catch {
          // `handleAdminMutationError` đã hiện notification bản địa hoá.
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!rejectTarget) return;
    const item = rejectTarget;
    setBusy({ id: item.id, action: "reject" });
    try {
      await reject.mutateAsync({ id: item.id, reason });
      message.success("Đã từ chối học liệu");
      setRejectTarget(null);
      setPreviewItem((current) => (current?.id === item.id ? null : current));
      setSelectedIds((ids) => ids.filter((id) => id !== item.id));
    } catch {
      // Giữ modal mở để người duyệt sửa lý do và thử lại.
    } finally {
      setBusy(null);
    }
  };

  const handleBulkApprove = () => {
    const targets = selectedItems.map((item) => ({ id: item.id, title: item.title }));
    if (targets.length === 0) return;
    Modal.confirm({
      title: `Duyệt ${targets.length} học liệu`,
      content:
        "Mỗi mục là một lệnh riêng — có thể một số mục thất bại (đã bị người khác xử, hoặc ngoài phạm vi duyệt của bạn). Kết quả sẽ liệt kê rõ từng mục hỏng.",
      okText: `Duyệt ${targets.length} mục`,
      cancelText: "Huỷ",
      onOk: async () => {
        const result = await bulkApprove.mutateAsync({ items: targets });
        setSelectedIds([]);
        setBulkResult(result);
      },
    });
  };

  return (
    <div>
      <Typography.Title level={3}>Hàng đợi duyệt học liệu</Typography.Title>
      <Typography.Paragraph type="secondary">
        Học liệu và đề thi (PE/FE) do người dùng đóng góp, đang chờ duyệt trong phạm vi bạn được
        quyền duyệt. Bộ lọc và ô tìm kiếm áp dụng trong <strong>trang hiện tại</strong>.
      </Typography.Paragraph>

      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Input.Search
                placeholder="Tìm tiêu đề / môn trong trang"
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 260 }}
              />
              <Select
                placeholder="Loại học liệu"
                allowClear
                value={typeFilter}
                onChange={(value) => setTypeFilter(value as ResourceType | undefined)}
                options={RESOURCE_TYPE_OPTIONS}
                style={{ width: 180 }}
              />
            </Space>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                loading={queue.isFetching}
                onClick={() => queue.refetch()}
              >
                Làm mới
              </Button>
              <Can permissions={["resource.approve"]}>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  disabled={selectedIds.length === 0 || busy !== null}
                  loading={bulkApprove.isPending}
                  onClick={handleBulkApprove}
                >
                  Duyệt {selectedIds.length > 0 ? `${selectedIds.length} mục` : "hàng loạt"}
                </Button>
              </Can>
            </Space>
          </Space>

          {queue.isError && (
            <Alert
              type="error"
              showIcon
              message="Không thể tải hàng đợi duyệt"
              description={queue.error?.message}
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={() => queue.refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {queue.isLoading && !queue.data ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <ModerationQueueTable
              data={filtered}
              // Spinner phủ bảng CHỈ cho việc đổi trang / bấm Làm mới. Trong lúc duyệt hoặc từ
              // chối một dòng (kể cả refetch sau đó) thì bận là chuyện của dòng đó — phủ spinner
              // toàn bảng sẽ giấu mất đúng cái phản hồi theo dòng mà màn này cần.
              loading={queue.isFetching && busy === null && !bulkApprove.isPending}
              busy={busy}
              bulkRunning={bulkApprove.isPending}
              subjectLabel={subjectLabel}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              pagination={{
                current: page,
                pageSize,
                total: queue.data?.total ?? 0,
              }}
              onPaginationChange={(nextPage, nextSize) => {
                setPage(nextPage);
                setPageSize(nextSize);
                setSelectedIds([]);
              }}
              onPreview={setPreviewItem}
              onApprove={handleApprove}
              onReject={setRejectTarget}
            />
          )}

          {!queue.isLoading && !queue.isError && filtered.length === 0 && (
            <Empty
              description={
                hasFilters
                  ? "Không có mục nào khớp bộ lọc trong trang này"
                  : "Không có mục nào chờ duyệt"
              }
            >
              {hasFilters && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setTypeFilter(undefined);
                  }}
                >
                  Xoá bộ lọc
                </Button>
              )}
            </Empty>
          )}
        </Space>
      </Card>

      <ResourceModerationDetailDrawer
        item={previewItem}
        subjectLabel={subjectLabel(previewItem?.subjectId ?? null)}
        approving={busy?.id === previewItem?.id && busy?.action === "approve"}
        rejecting={busy?.id === previewItem?.id && busy?.action === "reject"}
        onClose={() => setPreviewItem(null)}
        onApprove={handleApprove}
        onReject={setRejectTarget}
      />

      <RejectResourceModal
        open={rejectTarget !== null}
        title={rejectTarget?.title}
        confirmLoading={busy?.action === "reject"}
        onCancel={() => setRejectTarget(null)}
        onSubmit={handleRejectSubmit}
      />

      <BulkApproveResultModal result={bulkResult} onClose={() => setBulkResult(null)} />
    </div>
  );
}
