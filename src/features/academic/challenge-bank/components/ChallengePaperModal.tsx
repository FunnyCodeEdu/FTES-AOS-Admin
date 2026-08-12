import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Modal,
  Progress,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { RcFile } from "antd/es/upload";
import { ApiError } from "../../../../shared/api/client";
import { adminErrorMessage } from "../../../../shared/api/errors";
import {
  useDeleteChallengePaper,
  useUploadChallengePaper,
} from "../api/challengeBankConsole.api";
import {
  describeFolderSkips,
  describePaperLimits,
  formatBytes,
  looksLikeZip,
  normalizeZipMime,
  PAPER_ACCEPT_ATTR,
  PAPER_FOLDER_MAX_RAW_BYTES,
  PAPER_ZIP_CANONICAL_MIME,
  paperKindOf,
  paperServerMessage,
  planPaperFolderZip,
  validatePaperFile,
  zipNeedsMagicCheck,
} from "../paperFile";
import { zipPaperFolder } from "../paperFolderZip";
import type { BankChallengeRow, ChallengePaperInfo } from "../types";

interface ChallengePaperModalProps {
  open: boolean;
  challenge: BankChallengeRow | null;
  disabled?: boolean;
  onClose: () => void;
  /** Gọi sau khi tải/gỡ thành công để caller refetch kho. */
  onChanged?: () => void;
}

/** Tệp sắp gửi. Nhánh thư mục cũng quy về một `File` để đường gửi lên CHỈ có một. */
interface PickedPaper {
  file: File;
  source: "file" | "folder";
  /** Số tệp nằm trong archive (chỉ nhánh thư mục). */
  fileCount?: number;
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
 * Đính ĐỀ THI vào một thử thách: tải lên, xem/tải về, thay, gỡ.
 *
 * Hai đường nạp đề, vì đề thật không phải lúc nào cũng là một tệp:
 *  1. **Chọn tệp** — ảnh scan, bản PDF, hoặc `.zip` admin đã nén sẵn.
 *  2. **Chọn cả thư mục** — trình duyệt nén tại chỗ (`jszip`) thành một `.zip`, GIỮ NGUYÊN đường dẫn
 *     tương đối, rồi gửi đúng cái archive đó. Đề PE (starter code + dữ liệu + mô tả nằm ở nhiều
 *     thư mục con) sống được là nhờ chỗ này.
 *
 * Kiểm định dạng + dung lượng ngay trên máy (`validatePaperFile`, trần THEO LOẠI: ảnh 25 MB · PDF
 * 50 MB · ZIP 50 MB) để một lượt tải 90 MB chắc chắn hỏng không ngốn của admin vài phút chờ. Nhưng
 * khi SERVER từ chối thì message của server được hiện NGUYÊN VĂN — trần là hợp đồng của server.
 *
 * Watermark: server đóng cho ảnh/PDF. Archive `.zip` KHÔNG đóng được, và copy ở đây không hứa thế.
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
  const [selected, setSelected] = useState<PickedPaper | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  /** Câu báo tệp bị bỏ khi nén thư mục — hiện cả khi nén thành công, không bao giờ bỏ im lặng. */
  const [folderNotes, setFolderNotes] = useState<string[]>([]);
  const [zipping, setZipping] = useState<{ percent: number; total: number } | null>(null);
  /** Đang soi 4 byte đầu của một `.zip` mà trình duyệt không khai được MIME. */
  const [inspecting, setInspecting] = useState(false);
  /** Đề vừa tải trong phiên — nguồn hiển thị khi dòng kho chưa mang field paper* (xem types.ts). */
  const [justUploaded, setJustUploaded] = useState<ChallengePaperInfo | null>(null);
  const [removed, setRemoved] = useState(false);

  /**
   * `JSZip.generateAsync` KHÔNG huỷ được giữa chừng. Mỗi lượt nén mang một số thứ tự; kết quả về mà
   * số đã đổi (admin chọn thư mục khác, hoặc đóng rồi mở lại modal) thì BỎ, không set state — nếu
   * không, archive của thư mục cũ sẽ lặng lẽ thay chỗ thư mục vừa chọn.
   */
  const zipRunRef = useRef(0);
  const magicRunRef = useRef(0);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * `webkitdirectory`/`directory` KHÔNG phải prop JSX hợp lệ của React → đặt bằng thuộc tính DOM qua
   * callback ref (đúng cách `ResourceFormModal` đang dùng cho picker thư mục học liệu).
   */
  const setFolderInputRef = useCallback((el: HTMLInputElement | null) => {
    folderInputRef.current = el;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
    }
  }, []);

  const resetPick = useCallback(() => {
    zipRunRef.current += 1;
    magicRunRef.current += 1;
    setSelected(null);
    setLocalError(null);
    setFolderNotes([]);
    setZipping(null);
    setInspecting(false);
  }, []);

  useEffect(() => {
    if (open) {
      resetPick();
      setJustUploaded(null);
      setRemoved(false);
    }
  }, [open, challenge?.id, resetPick]);

  const current = useMemo<ChallengePaperInfo | null>(() => {
    if (removed) return null;
    return justUploaded ?? paperOfRow(challenge);
  }, [removed, justUploaded, challenge]);

  const busy = zipping !== null || inspecting || upload.isPending || removePaper.isPending;

  /**
   * Soi magic bytes cho `.zip` mà trình duyệt trả MIME rỗng/chung chung. BE chỉ chấp
   * `application/octet-stream` khi 4 byte đầu ĐÚNG là zip, nên một tệp `.rar` đổi đuôi sẽ ăn 400 sau
   * khi đã truyền xong hàng chục MB. Đọc lỗi (quyền/đĩa/tệp đổi giữa chừng) thì CHO QUA — chặn oan còn
   * tệ hơn, server vẫn là lớp phán quyết cuối.
   */
  const verifyZipMagic = useCallback(async (file: File) => {
    const run = magicRunRef.current;
    setInspecting(true);
    try {
      const head = await file.slice(0, 4).arrayBuffer();
      if (magicRunRef.current !== run) return;
      if (!looksLikeZip(head)) {
        setSelected(null);
        setLocalError(
          `“${file.name}” không phải tệp .zip thật (4 byte đầu không mang chữ ký zip) — máy chủ sẽ từ chối. Hãy nén lại thành .zip rồi chọn lại.`
        );
      }
    } catch {
      // Không đọc được byte đầu: im lặng cho qua, để server phán.
    } finally {
      if (magicRunRef.current === run) setInspecting(false);
    }
  }, []);

  const beforeUpload = (file: RcFile) => {
    resetPick();
    const problem = validatePaperFile(file);
    if (problem) {
      setLocalError(problem);
      // `Upload.LIST_IGNORE` để tệp bị từ chối không nằm lại trong danh sách nội bộ của AntD.
      return Upload.LIST_IGNORE;
    }

    // Zip: gửi lên bằng MIME hợp đồng (`application/zip`) kể cả khi OS khai alias lạ hoặc bỏ trống.
    // `new File([file], …)` chỉ bọc lại tham chiếu blob, KHÔNG copy 100 MB dữ liệu.
    const picked =
      paperKindOf(file) === "zip"
        ? new File([file], file.name, { type: normalizeZipMime(file.type) })
        : (file as File);

    setSelected({ file: picked, source: "file" });
    if (zipNeedsMagicCheck(file)) void verifyZipMagic(picked);
    return false; // tải lên là hành động tường minh của người dùng, không tự động
  };

  /** Thư mục → kế hoạch → nén (có tiến độ) → archive kèm CỠ THẬT, chờ admin bấm "Tải lên". */
  const onFolderPicked = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    resetPick();
    const run = zipRunRef.current;

    const plan = planPaperFolderZip(files);
    setFolderNotes(describeFolderSkips(plan));

    if (plan.items.length === 0) {
      setLocalError(
        `Thư mục có ${plan.picked} tệp nhưng không tệp nào nén được (toàn tệp rác hoặc rỗng).`
      );
      return;
    }
    if (plan.rawBytes > PAPER_FOLDER_MAX_RAW_BYTES) {
      setLocalError(
        `Thư mục nặng ${formatBytes(plan.rawBytes)} (${plan.items.length} tệp) — quá lớn để nén trong trình duyệt (trần ${formatBytes(PAPER_FOLDER_MAX_RAW_BYTES)}). Hãy tách bớt nội dung rồi chọn lại.`
      );
      return;
    }

    setZipping({ percent: 0, total: plan.items.length });
    try {
      const result = await zipPaperFolder(plan, {
        fallbackName: challenge?.title,
        onProgress: (percent) => {
          if (zipRunRef.current !== run) return;
          setZipping((prev) => (prev ? { ...prev, percent: Math.round(percent) } : prev));
        },
      });
      if (zipRunRef.current !== run) return;

      const archive = new File([result.blob], result.filename, {
        type: PAPER_ZIP_CANONICAL_MIME,
      });
      const problem = validatePaperFile(archive);
      if (problem) {
        setLocalError(`${problem} (nén từ ${result.fileCount} tệp — hãy tách bớt rồi chọn lại).`);
        return;
      }
      setSelected({ file: archive, source: "folder", fileCount: result.fileCount });
    } catch (error) {
      if (zipRunRef.current !== run) return;
      setLocalError(
        `Nén thư mục thất bại: ${error instanceof Error ? error.message : "lỗi không rõ"}.`
      );
    } finally {
      if (zipRunRef.current === run) setZipping(null);
    }
  };

  const doUpload = () => {
    if (!challenge || !selected) return;
    upload.mutate(
      { id: challenge.id, file: selected.file },
      {
        onSuccess: (info) => {
          setJustUploaded(info);
          setRemoved(false);
          resetPick();
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
      width={560}
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

        {folderNotes.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="Một số tệp không được nén vào archive"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {folderNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            }
          />
        )}

        {uploadError && (
          <Alert
            type="error"
            showIcon
            message={
              isEndpointMissing(uploadError)
                ? "Máy chủ chưa mở endpoint tải đề thi (đang triển khai) — thử lại sau khi backend được deploy."
                : "Máy chủ từ chối tệp đề"
            }
            // Trần/định dạng là hợp đồng của SERVER: hiện nguyên văn câu của nó, chỉ cắt tiền tố mã.
            description={
              isEndpointMissing(uploadError)
                ? undefined
                : paperServerMessage(adminErrorMessage(uploadError))
            }
          />
        )}

        {!disabled && (
          <>
            <Divider style={{ margin: "4px 0" }} />

            <div>
              <Typography.Text strong>Đề dạng ảnh/PDF (hoặc .zip có sẵn)</Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Một tệp duy nhất: ảnh scan, bản PDF, hoặc archive bạn đã tự nén.
                </Typography.Text>
              </div>
              <Upload
                accept={PAPER_ACCEPT_ATTR}
                beforeUpload={beforeUpload}
                showUploadList={false}
                maxCount={1}
                disabled={busy}
              >
                <Button icon={<UploadOutlined />} disabled={busy} style={{ marginTop: 8 }}>
                  {current ? "Chọn tệp thay thế" : "Chọn tệp đề"}
                </Button>
              </Upload>
            </div>

            <div>
              <Typography.Text strong>
                Bộ đề dạng thư mục / nhiều tệp → sẽ nén thành .zip
              </Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Chọn cả thư mục (starter code, dữ liệu mẫu, ảnh đề…): trình duyệt nén tại chỗ,
                  giữ nguyên cấu trúc thư mục con, rồi gửi một tệp .zip.
                </Typography.Text>
              </div>
              <input
                ref={setFolderInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const picked = e.target.files;
                  void onFolderPicked(picked);
                  // Xoá value để chọn LẠI đúng thư mục đó vẫn kích hoạt onChange.
                  e.target.value = "";
                }}
              />
              <Button
                icon={<FolderOpenOutlined />}
                onClick={() => folderInputRef.current?.click()}
                disabled={busy}
                style={{ marginTop: 8 }}
              >
                Chọn cả thư mục
              </Button>
            </div>

            {zipping && (
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Đang nén {zipping.total} tệp thành .zip…
                </Typography.Text>
                <Progress percent={zipping.percent} status="active" />
              </div>
            )}

            {inspecting && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Đang kiểm tra tệp .zip…
              </Typography.Text>
            )}

            {selected && (
              <Alert
                type="success"
                showIcon
                message={
                  selected.source === "folder"
                    ? `Đã nén ${selected.fileCount} tệp → ${selected.file.name}`
                    : `Đã chọn: ${selected.file.name}`
                }
                description={`Sẽ gửi lên ${formatBytes(selected.file.size)}.`}
              />
            )}

            <Space wrap>
              <Button
                type="primary"
                disabled={!selected || busy}
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
                  disabled={busy && !removePaper.isPending}
                  onClick={doRemove}
                >
                  Gỡ đề
                </Button>
              )}
            </Space>
          </>
        )}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Nhận {describePaperLimits()}. Máy chủ đóng watermark cho ảnh và PDF; tệp .zip giữ nguyên
          (archive không đóng dấu được). Thư mục chọn ở trên được nén tối đa{" "}
          {formatBytes(PAPER_FOLDER_MAX_RAW_BYTES)} dữ liệu thô, và archive tạo ra vẫn phải nằm dưới
          trần .zip.
        </Typography.Text>
      </Space>
    </Modal>
  );
}
