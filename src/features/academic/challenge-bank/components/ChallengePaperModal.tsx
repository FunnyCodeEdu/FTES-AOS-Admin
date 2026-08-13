import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Empty,
  List,
  Modal,
  Popconfirm,
  Progress,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { RcFile } from "antd/es/upload";
import { ApiError } from "../../../../shared/api/client";
import { adminErrorMessage } from "../../../../shared/api/errors";
import {
  useChallengePaperFiles,
  useDeleteChallengePaper,
  useDeleteChallengePaperFile,
  useReorderChallengePaperFiles,
  useUploadChallengePaper,
  useUploadChallengePaperFiles,
} from "../api/challengeBankConsole.api";
import {
  describeFolderSkips,
  describePaperBatchLimits,
  describePaperLimits,
  formatBytes,
  looksLikeZip,
  mergePaperPicks,
  movePaperFile,
  normalizeZipMime,
  PAPER_ACCEPT_ATTR,
  PAPER_FOLDER_MAX_RAW_BYTES,
  PAPER_ZIP_CANONICAL_MIME,
  paperKindOf,
  paperRoleColor,
  paperRoleLabel,
  paperServerMessage,
  planPaperFolderZip,
  validatePaperBatch,
  validatePaperFile,
  zipNeedsMagicCheck,
} from "../paperFile";
import { zipPaperFolder } from "../paperFolderZip";
import type {
  BankChallengeRow,
  ChallengePaperFileView,
  ChallengePaperInfo,
} from "../types";

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
 * Đính BỘ ĐỀ vào một thử thách: tải lên nhiều tệp, xem/tải về, sắp thứ tự, gỡ từng tệp.
 *
 * Vì sao "bộ" chứ không phải "một tệp": đề PE thật gồm **ảnh/PDF đề** (thí sinh ĐỌC) **kèm template
 * .zip/.docx/.xlsx** (thí sinh TẢI VỀ làm bài). Gói cả hai vào một archive — như lối thư mục→ZIP
 * trước đây làm — nghĩa là thí sinh phải tải về + giải nén mới đọc được đề.
 *
 * Ba đường nạp đề, vì đề thật đến theo ba hình dạng khác nhau:
 *  1. **Chọn nhiều tệp** — mấy trang ảnh scan + một template, gửi thẳng, mỗi tệp một vai riêng.
 *  2. **Chọn cả thư mục** — GIỮ NGUYÊN: trình duyệt nén tại chỗ (`jszip`) thành một `.zip`, giữ
 *     đường dẫn tương đối. Vẫn là công cụ đúng cho bộ starter-code vài trăm tệp có cấu trúc thư mục
 *     con, thứ mà đính lẻ ra thì mất luôn cấu trúc.
 *  3. Cả hai lối trên trộn được trong cùng một lượt gửi (chọn thêm nhiều lần trước khi bấm Tải lên).
 *
 * **Vai (Xem tại chỗ / Tải về) do SERVER trả** — suy từ MIME đã lưu. UI chỉ dán nhãn, không suy lại
 * (xem `PaperFileRole` trong `types.ts`).
 *
 * Kiểm định dạng + dung lượng ngay trên máy (`validatePaperFile` theo loại, `validatePaperBatch` cho
 * trần số tệp/tổng byte của cả bộ) để một lượt tải chắc chắn hỏng không ngốn của admin vài phút chờ.
 * Nhưng khi SERVER từ chối thì message của server được hiện NGUYÊN VĂN — trần là hợp đồng của server
 * — và danh sách tệp ĐANG ĐÍNH giữ nguyên, không bị dọn đi cùng lỗi.
 *
 * ĐƯỜNG LÙI: endpoint `paper-files` chưa deploy (404/405) ⇒ modal rơi về đường `/paper` một-tệp cũ
 * (hiển thị 4 cột `paper_*` của dòng kho, upload một tệp, "Gỡ đề"). Nếu không có nhánh này, màn hình
 * đang chạy tốt sẽ chết hẳn cho tới ngày BE lên.
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
  const paperFiles = useChallengePaperFiles(challenge?.id, open);
  const uploadMany = useUploadChallengePaperFiles();
  const removeFile = useDeleteChallengePaperFile();
  const reorder = useReorderChallengePaperFiles();
  const uploadLegacy = useUploadChallengePaper();
  const removeLegacyPaper = useDeleteChallengePaper();

  const [picked, setPicked] = useState<PickedPaper[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  /** Câu báo tệp bị bỏ khi nén thư mục — hiện cả khi nén thành công, không bao giờ bỏ im lặng. */
  const [folderNotes, setFolderNotes] = useState<string[]>([]);
  const [zipping, setZipping] = useState<{ percent: number; total: number } | null>(null);
  /** Đang soi 4 byte đầu của một `.zip` mà trình duyệt không khai được MIME. */
  const [inspecting, setInspecting] = useState(false);
  /** Đề vừa tải trong phiên qua ĐƯỜNG CŨ — nguồn hiển thị khi dòng kho chưa mang field paper*. */
  const [justUploaded, setJustUploaded] = useState<ChallengePaperInfo | null>(null);
  const [removed, setRemoved] = useState(false);

  /**
   * `JSZip.generateAsync` KHÔNG huỷ được giữa chừng. Mỗi lượt nén mang một số thứ tự; kết quả về mà
   * số đã đổi (admin chọn thư mục khác, hoặc đóng rồi mở lại modal) thì BỎ, không set state — nếu
   * không, archive của thư mục cũ sẽ lặng lẽ chen vào danh sách sắp gửi.
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
    setPicked([]);
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
      uploadMany.reset();
      uploadLegacy.reset();
    }
    // CỐ Ý không đưa `uploadMany`/`uploadLegacy` vào deps: react-query trả object MỚI mỗi lần
    // render, effect sẽ chạy lại vô tận. Chỉ lúc mở modal / đổi thử thách mới cần dọn.
  }, [open, challenge?.id, resetPick]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Bộ đề nhiều-tệp CHỈ dùng được khi endpoint đã deploy. 404/405 ⇒ rơi về đường `/paper` cũ; lỗi
   * khác (403/500) KHÔNG rơi về — đường cũ cũng sẽ hỏng y hệt, giả vờ có đường lùi chỉ làm admin
   * thử lại vô ích.
   */
  const multiUnavailable = isEndpointMissing(paperFiles.error);
  const attached: ChallengePaperFileView[] = useMemo(
    () => paperFiles.data ?? [],
    [paperFiles.data]
  );

  const legacyPaper = useMemo<ChallengePaperInfo | null>(() => {
    if (removed) return null;
    return justUploaded ?? paperOfRow(challenge);
  }, [removed, justUploaded, challenge]);

  const busy =
    zipping !== null ||
    inspecting ||
    uploadMany.isPending ||
    uploadLegacy.isPending ||
    removeFile.isPending ||
    reorder.isPending ||
    removeLegacyPaper.isPending;

  /** Trần SỐ TỆP / TỔNG BYTE của cả bộ — tính trên (đang đính + đang chọn), chặn trước khi gửi. */
  const batchProblem = useMemo(
    () => validatePaperBatch(attached, picked.map((p) => p.file)),
    [attached, picked]
  );

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
        // Chỉ gỡ ĐÚNG tệp hỏng khỏi lô; các tệp khác admin vừa chọn vẫn còn đó.
        setPicked((prev) => prev.filter((p) => p.file !== file));
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

  /**
   * Nhận CẢ LÔ trong một lượt.
   *
   * `beforeUpload(file, batch)` được AntD gọi MỘT LẦN CHO MỖI TỆP; chỉ xử lý ở tệp đầu rồi đọc cả
   * `batch` — nếu xử lý từng lượt gọi thì mỗi câu lỗi/ghi chú sẽ ghi đè lượt trước và với `multiple`
   * admin chỉ thấy đúng một dòng cuối cùng.
   */
  const acceptBatch = (batch: readonly File[]) => {
    setLocalError(null);
    const accepted: PickedPaper[] = [];
    const rejects: string[] = [];
    const zipsToVerify: File[] = [];

    for (const raw of batch) {
      const problem = validatePaperFile(raw);
      if (problem) {
        rejects.push(`“${raw.name}”: ${problem}`);
        continue;
      }
      // Zip: gửi lên bằng MIME hợp đồng (`application/zip`) kể cả khi OS khai alias lạ hoặc bỏ trống.
      // `new File([file], …)` chỉ bọc lại tham chiếu blob, KHÔNG copy 100 MB dữ liệu.
      const file =
        paperKindOf(raw) === "zip"
          ? new File([raw], raw.name, { type: normalizeZipMime(raw.type) })
          : raw;
      accepted.push({ file, source: "file" });
      if (zipNeedsMagicCheck(raw)) zipsToVerify.push(file);
    }

    let duplicates = 0;
    setPicked((prev) => {
      const merged = mergePaperPicks(prev, accepted);
      duplicates = merged.duplicates;
      return merged.picks;
    });

    const notes = [...rejects];
    if (duplicates > 0) notes.push(`Bỏ qua ${duplicates} tệp đã có trong danh sách sắp gửi.`);
    if (notes.length > 0) setLocalError(notes.join(" "));

    for (const zip of zipsToVerify) void verifyZipMagic(zip);
  };

  const beforeUpload = (file: RcFile, batch: RcFile[]) => {
    if (file === batch[0]) acceptBatch(batch as File[]);
    // `Upload.LIST_IGNORE` cho MỌI tệp: danh sách sắp gửi do modal này tự vẽ (có cỡ, có nút bỏ),
    // để AntD giữ thêm một bản nội bộ nữa là hai danh sách sớm muộn lệch nhau.
    return Upload.LIST_IGNORE;
  };

  /** Thư mục → kế hoạch → nén (có tiến độ) → archive kèm CỠ THẬT, THÊM vào lô chờ gửi. */
  const onFolderPicked = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    zipRunRef.current += 1;
    const run = zipRunRef.current;
    setLocalError(null);

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
      setPicked((prev) => {
        const merged = mergePaperPicks(prev, [
          { file: archive, source: "folder" as const, fileCount: result.fileCount },
        ]);
        return merged.picks;
      });
    } catch (error) {
      if (zipRunRef.current !== run) return;
      setLocalError(
        `Nén thư mục thất bại: ${error instanceof Error ? error.message : "lỗi không rõ"}.`
      );
    } finally {
      if (zipRunRef.current === run) setZipping(null);
    }
  };

  const dropPick = (file: File) => {
    setPicked((prev) => prev.filter((p) => p.file !== file));
  };

  /**
   * Đường lùi một-tệp (`POST /{id}/paper`, đã deploy). Lô nhiều hơn một tệp thì KHÔNG ghép bừa
   * thành archive sau lưng admin — nói thẳng là máy chủ chưa mở bộ đề nhiều tệp.
   */
  const uploadOneLegacy = (challengeId: string, files: File[]) => {
    if (files.length !== 1) {
      setLocalError(
        `Máy chủ chưa mở bộ đề nhiều tệp — hiện chỉ gửi được MỘT tệp mỗi lượt (đang chọn ${files.length}). Hãy bỏ bớt, hoặc gộp chúng lại bằng nút “Chọn cả thư mục”.`
      );
      return;
    }
    uploadLegacy.mutate(
      { id: challengeId, file: files[0] },
      {
        onSuccess: (info) => {
          uploadMany.reset();
          setJustUploaded(info);
          setRemoved(false);
          resetPick();
          message.success("Đã tải đề thi lên");
          onChanged?.();
        },
      }
    );
  };

  const doUpload = () => {
    if (!challenge || picked.length === 0 || batchProblem) return;
    const files = picked.map((p) => p.file);

    if (multiUnavailable) {
      uploadOneLegacy(challenge.id, files);
      return;
    }

    uploadMany.mutate(
      { id: challenge.id, files },
      {
        onSuccess: () => {
          resetPick();
          message.success(
            files.length > 1 ? `Đã tải ${files.length} tệp đề lên` : "Đã tải tệp đề lên"
          );
          onChanged?.();
        },
        onError: (error) => {
          // Endpoint chưa deploy ⇒ thử lại bằng đường `/paper` cũ (chỉ làm được lô một tệp).
          if (isEndpointMissing(error)) uploadOneLegacy(challenge.id, files);
        },
      }
    );
  };

  const doRemoveFile = (file: ChallengePaperFileView) => {
    if (!challenge) return;
    removeFile.mutate(
      { id: challenge.id, fileId: file.id },
      {
        onSuccess: () => {
          message.success("Đã gỡ tệp khỏi bộ đề");
          onChanged?.();
        },
      }
    );
  };

  const doMove = (index: number, direction: -1 | 1) => {
    if (!challenge) return;
    const next = movePaperFile(attached, index, direction);
    // `movePaperFile` trả CHÍNH mảng cũ khi không đổi được ⇒ khỏi bắn một lệnh sắp-xếp y nguyên.
    if (next === attached) return;
    reorder.mutate(
      { id: challenge.id, fileIds: next.map((f) => f.id) },
      { onSuccess: () => onChanged?.() }
    );
  };

  const doRemoveLegacy = () => {
    if (!challenge) return;
    Modal.confirm({
      title: "Gỡ đề thi",
      content:
        "Tệp đề sẽ bị gỡ khỏi thử thách này. Học viên đang xem sẽ không còn tải được đề. Bạn có thể tải lại tệp khác sau.",
      okText: "Gỡ đề",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () =>
        removeLegacyPaper.mutateAsync({ id: challenge.id }).then(() => {
          setRemoved(true);
          setJustUploaded(null);
          message.success("Đã gỡ đề thi");
          onChanged?.();
        }),
    });
  };

  /**
   * Lỗi từ SERVER khi tải lên. Cố ý KHÔNG dọn danh sách tệp đang đính khi có lỗi: bộ đề vẫn nguyên
   * vẹn ở server (BE từ chối cả lô, không đụng tệp cũ), giấu nó đi chỉ làm admin tưởng vừa mất đề.
   */
  const uploadError = uploadMany.error ?? uploadLegacy.error;
  const uploadRejected = uploadError && !isEndpointMissing(uploadError);
  const endpointMissing =
    multiUnavailable || (uploadError != null && isEndpointMissing(uploadError));

  return (
    <Modal
      title="Bộ đề đính kèm"
      open={open}
      onCancel={onClose}
      width={640}
      footer={<Button onClick={onClose}>Đóng</Button>}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {challenge && (
          <Typography.Text>
            Thử thách: <strong>{challenge.title}</strong>
          </Typography.Text>
        )}

        {endpointMissing ? (
          // --- ĐƯỜNG LÙI: BE chưa có bộ đề nhiều tệp; hiện đúng một tệp đề như trước.
          <>
            <Alert
              type="warning"
              showIcon
              message="Máy chủ chưa mở bộ đề nhiều tệp (đang triển khai)"
              description="Tạm thời mỗi thử thách chỉ đính được MỘT tệp đề. Chọn nhiều tệp sẽ không gửi được cho tới khi backend lên."
            />
            {legacyPaper ? (
              <Descriptions
                size="small"
                column={1}
                bordered
                items={[
                  {
                    key: "name",
                    label: "Tệp",
                    children: legacyPaper.paperFilename ?? "(không rõ tên tệp)",
                  },
                  {
                    key: "meta",
                    label: "Định dạng / cỡ",
                    children: `${legacyPaper.paperMime ?? "—"} · ${formatBytes(legacyPaper.paperSizeBytes)}`,
                  },
                  {
                    key: "link",
                    label: "Xem",
                    children: (
                      <a href={legacyPaper.paperUrl} target="_blank" rel="noreferrer">
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
          </>
        ) : (
          <List
            size="small"
            bordered
            loading={paperFiles.isLoading}
            dataSource={attached}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Thử thách này chưa có tệp đề nào."
                />
              ),
            }}
            renderItem={(file, index) => (
              <List.Item
                actions={
                  disabled
                    ? undefined
                    : [
                        <Button
                          key="up"
                          size="small"
                          icon={<ArrowUpOutlined />}
                          disabled={index === 0 || busy}
                          onClick={() => doMove(index, -1)}
                        />,
                        <Button
                          key="down"
                          size="small"
                          icon={<ArrowDownOutlined />}
                          disabled={index === attached.length - 1 || busy}
                          onClick={() => doMove(index, 1)}
                        />,
                        <Popconfirm
                          key="del"
                          title="Gỡ tệp này khỏi bộ đề?"
                          okText="Gỡ"
                          okButtonProps={{ danger: true }}
                          cancelText="Huỷ"
                          onConfirm={() => doRemoveFile(file)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} disabled={busy} />
                        </Popconfirm>,
                      ]
                }
              >
                <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
                  <Space size={8} wrap>
                    <Typography.Text>{file.filename ?? "(không rõ tên tệp)"}</Typography.Text>
                    {/* Vai do SERVER suy từ MIME — UI chỉ dán nhãn, không suy lại. */}
                    <Tag color={paperRoleColor(file.role)}>{paperRoleLabel(file.role)}</Tag>
                  </Space>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {[file.mime ?? "—", formatBytes(file.sizeBytes)].join(" · ")} ·{" "}
                    <a href={file.url} target="_blank" rel="noreferrer">
                      Mở / tải
                    </a>
                  </Typography.Text>
                </Space>
              </List.Item>
            )}
          />
        )}

        {paperFiles.error && !multiUnavailable && (
          <Alert
            type="error"
            showIcon
            message="Không đọc được bộ đề"
            description={adminErrorMessage(paperFiles.error)}
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

        {uploadRejected && (
          <Alert
            type="error"
            showIcon
            message="Máy chủ từ chối lượt tải này"
            // Trần/định dạng/chữ ký là hợp đồng của SERVER: hiện nguyên văn câu của nó, chỉ cắt tiền
            // tố mã. Danh sách tệp đang đính ở trên KHÔNG bị đụng tới.
            description={paperServerMessage(adminErrorMessage(uploadError))}
          />
        )}

        {!disabled && (
          <>
            <Divider style={{ margin: "4px 0" }} />

            <div>
              <Typography.Text strong>Chọn tệp đề (chọn được NHIỀU tệp)</Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Ảnh scan từng trang, bản PDF, và/hoặc template .zip thí sinh tải về làm bài — giữ
                  Ctrl/Shift để quét nhiều tệp một lượt.
                </Typography.Text>
              </div>
              <Upload
                accept={PAPER_ACCEPT_ATTR}
                beforeUpload={beforeUpload}
                showUploadList={false}
                multiple
                disabled={busy}
              >
                <Button icon={<UploadOutlined />} disabled={busy} style={{ marginTop: 8 }}>
                  Chọn tệp đề
                </Button>
              </Upload>
            </div>

            <div>
              <Typography.Text strong>
                Bộ đề dạng thư mục (nhiều thư mục con) → nén thành .zip
              </Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Chọn cả thư mục (starter code, dữ liệu mẫu…): trình duyệt nén tại chỗ, giữ nguyên
                  cấu trúc thư mục con, rồi gửi một tệp .zip. Dùng cho bộ tệp CÓ CẤU TRÚC; còn mấy
                  trang ảnh đề thì chọn thẳng ở trên để thí sinh xem tại chỗ, khỏi phải giải nén.
                </Typography.Text>
              </div>
              <input
                ref={setFolderInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = e.target.files;
                  void onFolderPicked(files);
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

            {picked.length > 0 && (
              <List
                size="small"
                header={
                  <Typography.Text strong>
                    Sắp gửi {picked.length} tệp ·{" "}
                    {formatBytes(picked.reduce((sum, p) => sum + p.file.size, 0))}
                  </Typography.Text>
                }
                dataSource={picked}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key="drop"
                        size="small"
                        type="text"
                        icon={<DeleteOutlined />}
                        disabled={busy}
                        onClick={() => dropPick(item.file)}
                      />,
                    ]}
                  >
                    <Typography.Text style={{ fontSize: 12 }}>
                      {item.source === "folder"
                        ? `${item.file.name} (nén từ ${item.fileCount} tệp)`
                        : item.file.name}{" "}
                      · {formatBytes(item.file.size)}
                    </Typography.Text>
                  </List.Item>
                )}
              />
            )}

            {batchProblem && <Alert type="error" showIcon message={batchProblem} />}

            <Space wrap>
              <Button
                type="primary"
                disabled={picked.length === 0 || busy || Boolean(batchProblem)}
                loading={uploadMany.isPending || uploadLegacy.isPending}
                onClick={doUpload}
              >
                Tải lên
              </Button>
              {endpointMissing && legacyPaper && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={removeLegacyPaper.isPending}
                  disabled={busy && !removeLegacyPaper.isPending}
                  onClick={doRemoveLegacy}
                >
                  Gỡ đề
                </Button>
              )}
            </Space>
          </>
        )}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Nhận {describePaperLimits()}; {describePaperBatchLimits()}. Máy chủ đóng watermark cho ảnh
          và PDF; tệp .zip giữ nguyên (archive không đóng dấu được). Thư mục chọn ở trên được nén tối
          đa {formatBytes(PAPER_FOLDER_MAX_RAW_BYTES)} dữ liệu thô, và archive tạo ra vẫn phải nằm
          dưới trần .zip.
        </Typography.Text>
      </Space>
    </Modal>
  );
}
