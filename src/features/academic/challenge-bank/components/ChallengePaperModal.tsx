import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Descriptions, Modal, Space, Typography, Upload, message } from "antd";
import { DeleteOutlined, InboxOutlined, UploadOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload";
import { ApiError } from "../../../../shared/api/client";
import { adminErrorMessage } from "../../../../shared/api/errors";
import {
  useDeleteChallengePaper,
  useUploadChallengePaper,
} from "../api/challengeBankConsole.api";
import {
  formatBytes,
  PAPER_ACCEPT_ATTR,
  PAPER_MAX_BYTES,
  validatePaperFile,
} from "../paperFile";
import type { BankChallengeRow, ChallengePaperInfo } from "../types";

interface ChallengePaperModalProps {
  open: boolean;
  challenge: BankChallengeRow | null;
  disabled?: boolean;
  onClose: () => void;
  /** Gọi sau khi tải/gỡ thành công để caller refetch kho. */
  onChanged?: () => void;
}

/** Đề thi hiện có của một dòng kho, nếu BE đã trả các field paper*. */
function paperOfRow(row: BankChallengeRow | null): ChallengePaperInfo | null {
  if (!row?.paperUrl) return null;
  return {
    paperUrl: row.paperUrl,
    paperMime: row.paperMime,
    paperFilename: row.paperFilename,
    paperSizeBytes: row.paperSizeBytes,
  };
}

/** 404/405 = endpoint chưa deploy, KHÁC hẳn "tệp của bạn sai" — phải nói cho đúng. */
function isEndpointMissing(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 404 || error.code === 405);
}

/**
 * Đính ĐỀ THI (PDF/ảnh) vào một thử thách: tải lên, xem/tải về, thay, gỡ.
 *
 * Kiểm tra định dạng + dung lượng ngay trên máy trước khi bắn request (`validatePaperFile`), soi
 * gương ràng buộc của BE (pdf/png/jpeg/webp, 25 MB). BE đóng watermark server-side — FE không đụng
 * vào nội dung tệp.
 *
 * KHÔNG có bất kỳ nút chấm bài nào ở đây: chấm AI đang khoá (bán sau).
 */
export function ChallengePaperModal({
  open,
  challenge,
  disabled,
  onClose,
  onChanged,
}: ChallengePaperModalProps) {
  const upload = useUploadChallengePaper();
  const removePaper = useDeleteChallengePaper();
  const [selected, setSelected] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  /** Đề vừa tải trong phiên — nguồn hiển thị khi dòng kho chưa mang field paper* (xem types.ts). */
  const [justUploaded, setJustUploaded] = useState<ChallengePaperInfo | null>(null);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setLocalError(null);
      setJustUploaded(null);
      setRemoved(false);
    }
  }, [open, challenge?.id]);

  const current = useMemo<ChallengePaperInfo | null>(() => {
    if (removed) return null;
    return justUploaded ?? paperOfRow(challenge);
  }, [removed, justUploaded, challenge]);

  const beforeUpload = (file: RcFile) => {
    const problem = validatePaperFile(file);
    if (problem) {
      setSelected(null);
      setLocalError(problem);
      // `Upload.LIST_IGNORE` để tệp bị từ chối không nằm lại trong danh sách nội bộ của AntD.
      return Upload.LIST_IGNORE;
    }
    setLocalError(null);
    setSelected(file);
    return false; // tải lên là hành động tường minh của người dùng, không tự động
  };

  const doUpload = () => {
    if (!challenge || !selected) return;
    upload.mutate(
      { id: challenge.id, file: selected },
      {
        onSuccess: (info) => {
          setJustUploaded(info);
          setRemoved(false);
          setSelected(null);
          message.success("Đã tải đề thi lên");
          onChanged?.();
        },
      }
    );
  };

  const doRemove = () => {
    if (!challenge) return;
    Modal.confirm({
      title: "Gỡ đề thi",
      content:
        "Tệp đề sẽ bị gỡ khỏi thử thách này. Học viên đang xem sẽ không còn tải được đề. Bạn có thể tải lại tệp khác sau.",
      okText: "Gỡ đề",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () =>
        removePaper.mutateAsync({ id: challenge.id }).then(() => {
          setRemoved(true);
          setJustUploaded(null);
          message.success("Đã gỡ đề thi");
          onChanged?.();
        }),
    });
  };

  const uploadError = upload.error;

  return (
    <Modal
      title="Đề thi đính kèm"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {challenge && (
          <Typography.Text>
            Thử thách: <strong>{challenge.title}</strong>
          </Typography.Text>
        )}

        {current ? (
          <Descriptions
            size="small"
            column={1}
            bordered
            items={[
              {
                key: "name",
                label: "Tệp",
                children: current.paperFilename ?? "(không rõ tên tệp)",
              },
              {
                key: "meta",
                label: "Định dạng / cỡ",
                children: `${current.paperMime ?? "—"} · ${formatBytes(current.paperSizeBytes)}`,
              },
              {
                key: "link",
                label: "Xem",
                children: (
                  <a href={current.paperUrl} target="_blank" rel="noreferrer">
                    Mở / tải đề
                  </a>
                ),
              },
            ]}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            icon={<InboxOutlined />}
            message="Thử thách này chưa có tệp đề."
          />
        )}

        {localError && <Alert type="error" showIcon message={localError} />}

        {uploadError && (
          <Alert
            type="error"
            showIcon
            message={
              isEndpointMissing(uploadError)
                ? "Máy chủ chưa mở endpoint tải đề thi (đang triển khai) — thử lại sau khi backend được deploy."
                : "Tải đề thất bại"
            }
            description={isEndpointMissing(uploadError) ? undefined : adminErrorMessage(uploadError)}
          />
        )}

        {!disabled && (
          <Space wrap>
            <Upload
              accept={PAPER_ACCEPT_ATTR}
              beforeUpload={beforeUpload}
              showUploadList={false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>
                {current ? "Chọn tệp thay thế" : "Chọn tệp đề"}
              </Button>
            </Upload>
            <Button
              type="primary"
              disabled={!selected}
              loading={upload.isPending}
              onClick={doUpload}
            >
              Tải lên
            </Button>
            {current && (
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={removePaper.isPending}
                onClick={doRemove}
              >
                Gỡ đề
              </Button>
            )}
          </Space>
        )}

        {selected && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Đã chọn: <strong>{selected.name}</strong> ({formatBytes(selected.size)})
          </Typography.Text>
        )}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Nhận PDF, PNG, JPEG, WebP — tối đa {formatBytes(PAPER_MAX_BYTES)}. Máy chủ tự đóng
          watermark khi phát tệp.
        </Typography.Text>
      </Space>
    </Modal>
  );
}
