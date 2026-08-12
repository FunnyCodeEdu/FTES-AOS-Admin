import { useCallback, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { TableProps } from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { ApiError } from "../../../../shared/api/client";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { SubjectSelect } from "../../components/SubjectSelect";
import { useSubjects } from "../../subjects/api/subjects.api";
import {
  useApproveChallenge,
  useChallengeReviewQueue,
  useRejectChallenge,
} from "../api/challengeBankConsole.api";
import { ChallengePaperModal } from "../components/ChallengePaperModal";
import { RejectChallengeModal } from "../components/RejectChallengeModal";
import {
  CHALLENGE_STATUS_COLOR,
  challengeDifficultyLabel,
  challengeStatusLabel,
  type BankChallengeRow,
} from "../types";

const DEFAULT_PAGE_SIZE = 20;

/** 404/405 = endpoint chưa deploy, phải nói khác với "hàng đợi trống". */
function isEndpointMissing(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 404 || error.code === 405);
}

/**
 * **Hàng đợi duyệt thử thách** — `GET /admin/challenges/review-queue`.
 *
 * MÀN NÀY CỐ Ý KHÔNG CÓ GATE QUYỀN Ở CLIENT — không `requiredPermissions` trên route, không `<Can>`
 * quanh nút Duyệt/Từ chối:
 *
 *   Quyền duyệt của CTV được cấp **theo SUBJECT** (scoped grant), không phải leaf GLOBAL trong
 *   `me.permissions`. Gate bằng danh sách leaf global sẽ ẩn đúng nút của đúng người được giao việc —
 *   lỗi này đã xảy ra một lần ở màn duyệt học liệu. Endpoint đã lọc theo phạm vi duyệt phía server và
 *   trả **trang RỖNG** (không 403) cho người không có phạm vi, nên render vô điều kiện là an toàn:
 *   người không được duyệt đơn giản là không thấy dòng nào.
 *
 * Hệ quả: payload rỗng KHÔNG phân biệt được "hết việc" với "bạn không có phạm vi duyệt" — không có
 * field nào trong response để suy ra. Empty state vì thế dùng đúng một câu trung tính.
 */
export default function ChallengeReviewQueuePage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [rejectTarget, setRejectTarget] = useState<BankChallengeRow | null>(null);
  const [paperTarget, setPaperTarget] = useState<BankChallengeRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const queue = useChallengeReviewQueue({ page, pageSize, subjectId });
  const approve = useApproveChallenge();
  const reject = useRejectChallenge();

  const subjects = useSubjects({ page: 1, pageSize: 1000 });
  const subjectLabel = useCallback(
    (id: string | null | undefined) => {
      if (!id) return "—";
      const found = (subjects.data?.items ?? []).find((s) => s.id === id);
      return found ? `${found.code} - ${found.name}` : `${id.slice(0, 8)}…`;
    },
    [subjects.data]
  );

  const handleApprove = (row: BankChallengeRow) => {
    Modal.confirm({
      title: "Duyệt thử thách",
      content: (
        <>
          Duyệt <strong>{row.title}</strong>? Thử thách sẽ rời hàng đợi và hiển thị theo phạm vi đã
          đặt. Quyết định được ghi vào audit log.
        </>
      ),
      okText: "Duyệt",
      cancelText: "Huỷ",
      onOk: async () => {
        setBusyId(row.id);
        try {
          await approve.mutateAsync({ id: row.id });
          message.success("Đã duyệt thử thách");
        } catch {
          // `handleAdminMutationError` đã hiện notification bản địa hoá.
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await reject.mutateAsync({ id: rejectTarget.id, reason });
      message.success("Đã từ chối thử thách");
      setRejectTarget(null);
    } catch {
      // Giữ modal mở để người duyệt sửa lý do và thử lại.
    } finally {
      setBusyId(null);
    }
  };

  const rows = queue.data?.items ?? [];

  const columns: TableProps<BankChallengeRow>["columns"] = [
    {
      title: "Thử thách",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.type} · {challengeDifficultyLabel(row.difficulty)}
          </Typography.Text>
          {(row.tags ?? []).length > 0 && (
            <Space size={[4, 4]} wrap style={{ marginTop: 4 }}>
              {(row.tags ?? []).map((tag) => (
                <Tag key={tag.slug} color="blue">
                  {tag.label || tag.slug}
                </Tag>
              ))}
            </Space>
          )}
        </Space>
      ),
    },
    { title: "Môn", width: 200, render: (_, row) => subjectLabel(row.subjectId) },
    {
      title: "Trạng thái",
      width: 130,
      render: (_, row) => (
        <Tag color={CHALLENGE_STATUS_COLOR[row.status] ?? "default"}>
          {challengeStatusLabel(row.status)}
        </Tag>
      ),
    },
    {
      title: "Đề thi",
      width: 120,
      render: (_, row) => (
        <Button size="small" type="link" onClick={() => setPaperTarget(row)}>
          {row.paperUrl ? "Xem đề" : "Kiểm tra"}
        </Button>
      ),
    },
    {
      title: "Quyết định",
      width: 200,
      render: (_, row) => (
        // KHÔNG bọc <Can>: xem javadoc đầu file — quyền duyệt là scoped theo môn, gate client-side
        // sẽ ẩn nút của đúng người có quyền. Server là nơi quyết định.
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            loading={busyId === row.id && approve.isPending}
            disabled={busyId !== null && busyId !== row.id}
            onClick={() => handleApprove(row)}
          >
            Duyệt
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseOutlined />}
            disabled={busyId !== null && busyId !== row.id}
            onClick={() => setRejectTarget(row)}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Duyệt thử thách</Typography.Title>
      <Typography.Paragraph type="secondary">
        Thử thách / đề thi đang chờ duyệt <strong>trong phạm vi bạn được quyền duyệt</strong> — máy
        chủ tự lọc theo phạm vi đó.
      </Typography.Paragraph>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <SubjectSelect
              value={subjectId}
              onChange={(value) => {
                setSubjectId(value);
                setPage(1);
              }}
              placeholder="Lọc theo môn"
            />
            <Button
              icon={<ReloadOutlined />}
              loading={queue.isFetching}
              onClick={() => queue.refetch()}
            >
              Làm mới
            </Button>
          </Space>

          {queue.isError && (
            <Alert
              type={isEndpointMissing(queue.error) ? "info" : "error"}
              showIcon
              message={
                isEndpointMissing(queue.error)
                  ? "Máy chủ chưa mở hàng đợi duyệt thử thách (đang triển khai)"
                  : "Không tải được hàng đợi duyệt"
              }
              description={
                isEndpointMissing(queue.error)
                  ? "Màn hình đã sẵn sàng; bấm Làm mới sau khi backend được deploy."
                  : adminErrorMessage(queue.error)
              }
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
            <Table<BankChallengeRow>
              rowKey="id"
              size="small"
              dataSource={rows}
              columns={columns}
              loading={queue.isFetching && busyId === null && Boolean(queue.data)}
              pagination={{
                current: page,
                pageSize,
                total: queue.data?.total ?? 0,
                showSizeChanger: true,
                onChange: (nextPage, nextSize) => {
                  setPage(nextPage);
                  setPageSize(nextSize);
                },
              }}
              locale={{
                emptyText: queue.isError ? (
                  "—"
                ) : (
                  <Empty description="Không có thử thách nào chờ duyệt" />
                ),
              }}
            />
          )}
        </Space>
      </Card>

      <RejectChallengeModal
        open={rejectTarget !== null}
        title={rejectTarget?.title}
        confirmLoading={reject.isPending}
        onCancel={() => setRejectTarget(null)}
        onSubmit={handleRejectSubmit}
      />

      <ChallengePaperModal
        open={paperTarget !== null}
        challenge={paperTarget}
        // Người duyệt xem đề để ra quyết định; sửa tệp đề là việc của người soạn.
        disabled
        onClose={() => setPaperTarget(null)}
      />
    </div>
  );
}
