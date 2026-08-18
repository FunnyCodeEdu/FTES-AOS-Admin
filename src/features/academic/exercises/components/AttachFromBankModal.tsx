import { useMemo, useState } from "react";
import { Alert, Button, Empty, Input, List, Modal, Select, Space, Tag, Typography, message } from "antd";
import {
  useAddChallengePlacement,
  useChallengeBank,
} from "../../challenge-bank/api/challengeBankConsole.api";
import { ChallengeTagPicker } from "../../challenge-bank/components/ChallengeTagPicker";
import type { BankChallengeRow, BankSearchParams } from "../../challenge-bank/types";

interface AttachFromBankModalProps {
  open: boolean;
  /** Bài học đích — thử thách chọn ở đây sẽ được THÊM vào bài này. */
  lessonId: string;
  lessonName?: string;
  onClose: () => void;
  /** Gắn xong: cho card cha làm mới danh sách của bài. */
  onAttached?: () => void;
}

const PAGE_SIZE = 10;

/**
 * Bộ lọc gửi lên kho khi nhặt bài về MỘT bài học.
 *
 * <b>KHÔNG có `onlyUnattached`, `subjectId`, `courseId`</b> — và đó là toàn bộ điểm của tính năng.
 * Thứ người dùng đang tìm gần như luôn là bài ĐÃ gắn ở đâu đó (dùng lại bài của môn khác chính là
 * định nghĩa của việc này), nên bật `onlyUnattached` sẽ lọc mất đúng tập cần tìm mà màn hình vẫn
 * hiện "không có thử thách nào khớp" như thể kho rỗng. Ghim môn/khoá thì lặp lại đúng giới hạn cũ:
 * đứng ở môn B không thấy bài của môn A.
 */
export function bankParamsForLesson(input: {
  q: string;
  tags: string[];
  type?: string;
  page: number;
}): BankSearchParams {
  const q = input.q.trim();
  return {
    ...(q ? { q } : {}),
    ...(input.tags.length > 0 ? { tags: input.tags } : {}),
    ...(input.type ? { type: input.type } : {}),
    page: input.page,
    pageSize: PAGE_SIZE,
  };
}

/**
 * Thử thách đã nằm trong CHÍNH bài học này chưa?
 *
 * BE idempotent nên bấm thêm lần nữa vô hại, nhưng một cái nút không làm gì vẫn là một cái nút nói
 * dối — hiện nhãn trạng thái thay vì mời bấm.
 */
export function isAlreadyInLesson(row: BankChallengeRow, lessonId: string): boolean {
  return (row.placements ?? []).some((placement) => placement.lessonId === lessonId);
}

/** Loại thử thách lọc được — khớp taxonomy BE (`ChallengeType`). */
const TYPES = ["CODING", "SQL", "CODE", "ESSAY", "MULTIPLE_CHOICE", "UIUX", "AI", "BUSINESS"];

/**
 * "Thêm từ kho" — nhặt một thử thách ĐÃ CÓ trong kho chung về bài học này.
 *
 * <b>Vì sao cần</b>: trước đây từ bài học chỉ có hai đường — TẠO MỚI, hoặc nhặt trong danh sách
 * "chưa gắn" của CHÍNH KHOÁ ĐÓ. Thử thách soạn ở môn A vì thế vô hình khi đứng từ môn B, dù kho
 * chung (`/academic/challenge-bank`) vẫn thấy đủ. Muốn dùng lại phải đi đường vòng: mở kho → tìm →
 * "Đặt vào bài học". Cái thiếu là chiều ngược lại, và đây là nó.
 *
 * <b>THÊM chỗ dùng, KHÔNG chuyển chỗ</b>: dùng `POST /challenges/{id}/placements` chứ không phải
 * `PUT /challenges/{id}/lesson`. Đường PUT là CHUYỂN — nhặt bài của môn A về môn B bằng nó sẽ gỡ
 * mất bài khỏi môn A, tức "dùng lại" hoá ra là "lấy đi". POST placements là nhiều-nhiều và
 * idempotent (bấm lại không nhân đôi).
 *
 * <b>KHÔNG lọc `onlyUnattached`</b>: thứ người dùng đang tìm gần như luôn là bài ĐÃ gắn ở đâu đó —
 * đó chính là định nghĩa của dùng lại. Bài đã có trong bài học này thì hiện nhãn thay cho nút.
 */
export function AttachFromBankModal({
  open,
  lessonId,
  lessonName,
  onClose,
  onAttached,
}: AttachFromBankModalProps) {
  const [q, setQ] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [type, setType] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  const params = useMemo(
    () => bankParamsForLesson({ q, tags, type, page }),
    [q, tags, type, page],
  );
  const bank = useChallengeBank(params, open);
  const addPlacement = useAddChallengePlacement();

  const attach = async (row: BankChallengeRow) => {
    setAttachingId(row.id);
    try {
      await addPlacement.mutateAsync({ id: row.id, lessonId });
      message.success(`Đã thêm "${row.title}" vào bài học.`);
      onAttached?.();
      // KHÔNG đóng modal: gắn nhiều bài một lượt là việc thường, đóng sau mỗi lần gắn buộc người
      // dùng mở lại và gõ lại bộ lọc.
      await bank.refetch();
    } finally {
      setAttachingId(null);
    }
  };

  const rows = bank.data?.items ?? [];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={lessonName ? `Thêm từ kho → ${lessonName}` : "Thêm thử thách từ kho"}
      footer={<Button onClick={onClose}>Đóng</Button>}
      width={760}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="Thử thách được THÊM vào bài này, không bị gỡ khỏi các bài đang dùng nó."
        />

        <Space wrap style={{ width: "100%" }}>
          <Input.Search
            allowClear
            placeholder="Tìm theo tiêu đề"
            style={{ width: 260 }}
            onSearch={(value) => {
              setQ(value.trim());
              setPage(1);
            }}
          />
          <ChallengeTagPicker
            value={tags}
            onChange={(next) => {
              setTags(next);
              setPage(1);
            }}
            style={{ minWidth: 220 }}
          />
          <Select
            allowClear
            placeholder="Loại"
            style={{ width: 160 }}
            value={type}
            onChange={(next) => {
              setType(next);
              setPage(1);
            }}
            options={TYPES.map((value) => ({ value, label: value }))}
          />
        </Space>

        {bank.isError && (
          <Alert
            type="error"
            showIcon
            message="Không đọc được kho thử thách"
            description={bank.error?.message}
          />
        )}

        {rows.length === 0 && !bank.isLoading && !bank.isError ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có thử thách nào khớp bộ lọc."
          />
        ) : (
          <List
            size="small"
            loading={bank.isLoading}
            dataSource={rows}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: bank.data?.total ?? 0,
              onChange: setPage,
              size: "small",
              hideOnSinglePage: true,
            }}
            renderItem={(row) => {
              // Đã nằm trong bài này rồi thì nút "Thêm" là một cú bấm không có tác dụng (BE
              // idempotent) — nói ra trạng thái đó thay vì mời bấm.
              const already = isAlreadyInLesson(row, lessonId);
              return (
                <List.Item
                  actions={[
                    already ? (
                      <Tag key="in" color="green">
                        Đã có trong bài
                      </Tag>
                    ) : (
                      <Button
                        key="add"
                        size="small"
                        type="primary"
                        loading={attachingId === row.id}
                        onClick={() => void attach(row)}
                      >
                        Thêm vào bài
                      </Button>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    title={row.title}
                    description={
                      <Space size={4} wrap>
                        <Tag>{row.type}</Tag>
                        {row.difficulty ? <Tag color="blue">{row.difficulty}</Tag> : null}
                        {(row.tags ?? []).map((tag) => (
                          <Tag key={tag.slug} color="purple">
                            {tag.label}
                          </Tag>
                        ))}
                        <Typography.Text type="secondary">
                          {(row.placements ?? []).length > 0
                            ? `đang dùng ở ${(row.placements ?? []).length} bài`
                            : "chưa gắn bài nào"}
                        </Typography.Text>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Space>
    </Modal>
  );
}
