import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Form, Input, Modal, Progress, Radio, Select, Space, Typography, message } from "antd";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { SubjectSelect } from "../../components/SubjectSelect";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { ForbiddenError } from "../../../../shared/api/client";
import { RESOURCE_LICENSE_OPTIONS, RESOURCE_TYPE_OPTIONS, RESOURCE_VISIBILITY_OPTIONS } from "../constants";
import { useMe } from "../../../auth/api";
import {
  fetchFeAlbum,
  uploadFeAlbumImage,
  uploadFeImageTextItems,
  uploadFeTextItems,
  useCreateResource,
  useFeAlbum,
  useUpdateResource,
  useUploadResourceFile,
} from "../api/resources.api";
import {
  FE_ALBUM_MAX_IMAGES,
  describePlanWarnings,
  estimateUploadSeconds,
  formatDuration,
  planFeAlbumUpload,
  planFeTextUpload,
  runFeAlbumUpload,
  batchFeUploadItems,
  FE_IMAGE_TEXT_FILES_PER_REQUEST,
  FE_TEXT_FILES_PER_REQUEST,
  type FeAlbumUploadItem,
  type FeRunProgress,
  type FeUploadMode,
} from "../lib/feAlbumUpload";
import type { Resource, ResourceFormValues, ResourceType } from "../../types";

interface ResourceFormModalProps {
  open: boolean;
  resource?: Resource | null;
  onClose: () => void;
  /** Gọi sau khi lưu (+upload) thành công — cha refetch/thông báo. */
  onSaved?: () => void;
  subjectLocked?: boolean;
  /** CTV: ép subjectId theo scope đang chọn (bỏ qua giá trị form). */
  forcedSubjectId?: string;
}

// Suy ra MIME từ đuôi file khi trình duyệt trả file.type rỗng (hay gặp trên Windows với .md/.java…).
// BE whitelist theo ResourceType KHÔNG bao giờ chấp application/octet-stream → phải đoán đúng.
const EXT_MIME: Record<string, string> = {
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  pdf: "application/pdf",
  zip: "application/zip",
  json: "application/json",
  csv: "text/csv",
};

function guessMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "application/octet-stream";
}

/** Lượt tải album còn dang dở — giữ để bấm lại là NẠP TIẾP chứ không nạp lại từ đầu. */
interface PendingAlbumRun {
  resourceId: string;
  items: FeAlbumUploadItem[];
  /** Số ảnh album đã có TRƯỚC lượt này (đối chiếu với `total` của server khi nạp tiếp). */
  baseCount: number;
  /** Số ảnh của `items` đã nằm trên server. */
  uploaded: number;
}

/** Dòng trạng thái tiếng Việt cho tiến độ album — nói rõ đang làm gì và vì sao phải chờ. */
function albumRunText(run: FeRunProgress, waitSeconds: number): string {
  const position = `trang ${Math.min(run.index + 1, run.total)}/${run.total}`;
  if (run.state === "waiting") {
    return `Chờ ${waitSeconds || Math.ceil((run.waitMs ?? 0) / 1000)}s để không vượt giới hạn 10 ảnh/phút — kế tiếp: ${position}.`;
  }
  if (run.state === "retrying") {
    return `Máy chủ chặn tần suất ở ${position} — thử lại sau ${waitSeconds || Math.ceil((run.waitMs ?? 0) / 1000)}s (lần ${run.attempt}/${run.maxAttempts}).`;
  }
  return `Đang tải ${position} — ${run.name}`;
}

/**
 * Một dòng nói rõ người soạn ĐƯỢC GÌ và MẤT GÌ ở mỗi đường — đặt ngay dưới nút chọn, vì đây là chỗ
 * quyết định chứ không phải chỗ tra cứu. Riêng "mất ảnh gốc" phải nói thẳng: nó không hoàn tác được.
 */
function albumModeHint(mode: FeUploadMode): string {
  switch (mode) {
    case "image":
      return "Giữ nguyên từng trang làm ảnh. Hợp với đề scan có hình vẽ tay hoặc ký hiệu lạ. Trang KHÔNG tìm kiếm được, không copy được và bot giải đề không đọc được.";
    case "image-text":
      return "AI đọc ảnh và chuyển thành chữ (bảng → bảng, công thức → LaTeX, hình vẽ → cắt ảnh nhúng). Trang tìm kiếm được, copy được, bot giải đề đọc được — nhưng ảnh gốc KHÔNG được lưu lại. Nạp 3 trang mỗi lượt, mỗi trang mất khoảng 12 giây.";
    default:
      return "Nạp đề đã có sẵn dạng .txt/.md, AI chỉ dọn lại hình thức. Nhanh nhất trong ba đường vì không phải đọc ảnh.";
  }
}

/**
 * Lỗi của luồng album. 403 KHÔNG đi qua bảng mã (interceptor đổi thành `ForbiddenError` trước) nên
 * phải tự nói ai mới được ghi album — đúng luật BE `isOwnerOrApprover` + leaf `resource.fe.contribute`.
 */
function albumErrorMessage(error: unknown): string {
  if (error instanceof ForbiddenError) {
    return "Bạn không có quyền thêm ảnh vào album này — chỉ chủ học liệu hoặc người duyệt môn mới thêm được.";
  }
  return adminErrorMessage(error);
}

export function ResourceFormModal({
  open,
  resource,
  onClose,
  onSaved,
  subjectLocked,
  forcedSubjectId,
}: ResourceFormModalProps) {
  const [form] = Form.useForm<ResourceFormValues>();
  const isEdit = Boolean(resource);
  const type = Form.useWatch("type", form) as ResourceType | undefined;
  // type=FE KHÔNG còn là "thư mục nén zip" mà là ALBUM ẢNH: mỗi ảnh một dòng resource.fe_images
  // (sortOrder + caption + bình luận riêng), nạp từng tấm qua POST /resources/{id}/images.
  const isFeAlbum = type === "FE";

  const { data: me } = useMe();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource(resource?.id);
  const uploadFile = useUploadResourceFile();

  // BE (ResourceService.uploadVersion, owner-only qua ResourceGuard.isOwner) chỉ cho CHÍNH chủ
  // upload (uploaderId == currentUserId) — approver/moderator vẫn bị 403. Nên chỉ mở ô chọn file
  // khi tạo mới hoặc khi sửa học liệu do CHÍNH mình tạo. Không rõ id mình (me chưa load) thì KHÔNG
  // chặn nhầm. (Luật này KHÔNG áp cho album FE — album cho cả người duyệt môn ghi, xem dưới.)
  const canUploadVersion =
    !isEdit || !resource?.createdBy || !me?.user?.id || me.user.id === resource.createdBy;

  const [file, setFile] = useState<File | null>(null);
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  // Mặc định GIỮ NGUYÊN đường cũ (ảnh thuần) thay vì chọn hộ đường số hoá: hai đường cho ra hai
  // loại trang khác nhau và đường số hoá KHÔNG giữ lại ảnh gốc — im lặng đổi mặc định là im lặng
  // đổi thứ người soạn nhận được ở đầu ra.
  const [albumMode, setAlbumMode] = useState<FeUploadMode>("image");
  const [changelog, setChangelog] = useState("");
  const [phase, setPhase] = useState<"idle" | "saving" | "uploading">("idle");
  const [percent, setPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [albumRun, setAlbumRun] = useState<FeRunProgress | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  // Giữ id học liệu vừa tạo để nếu bước upload lỗi, bấm "Tạo" lại KHÔNG tạo trùng học liệu mới.
  const createdIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef<PendingAlbumRun | null>(null);

  // Album của học liệu ĐANG SỬA: cho biết còn bao nhiêu chỗ trong trần `maxImages` và — quan trọng
  // hơn — `canManage` (quyền ghi do SERVER tính). Không hỏi khi TẠO vì chưa có resource để hỏi.
  const { data: album } = useFeAlbum(resource?.id, open && isEdit && isFeAlbum);
  const albumMax = album?.maxImages ?? FE_ALBUM_MAX_IMAGES;
  const albumTotal = album?.total ?? 0;
  const albumCapacity = isEdit ? Math.max(0, albumMax - albumTotal) : albumMax;
  // KHÔNG đoán quyền ở client (grant duyệt của CTV là theo TỪNG MÔN, client chỉ thấy leaf global):
  // chỉ ẩn ô chọn khi server đã NÓI RÕ canManage=false. Chưa biết → cứ hiện, sai thì 403 nói giúp.
  const canManageAlbum = !isEdit || album?.canManage !== false;

  const albumPlan = useMemo(
    () =>
      !isFeAlbum || folderFiles.length === 0
        ? null
        : albumMode === "text"
          ? planFeTextUpload(folderFiles, albumCapacity)
          : planFeAlbumUpload(folderFiles, albumCapacity),
    [isFeAlbum, folderFiles, albumCapacity, albumMode]
  );
  const albumWarnings = useMemo(() => (albumPlan ? describePlanWarnings(albumPlan) : []), [albumPlan]);

  // input webkitdirectory: React JSX không có prop này → set attribute qua callback ref + lưu ref để click.
  const setFolderInputRef = useCallback((el: HTMLInputElement | null) => {
    folderInputRef.current = el;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
    }
  }, []);

  const resetUploadState = useCallback(() => {
    setFile(null);
    setFolderFiles([]);
    setChangelog("");
    setPercent(0);
    setPhase("idle");
    setErrorMsg(null);
    setAlbumRun(null);
    setWaitSeconds(0);
    createdIdRef.current = null;
    pendingRef.current = null;
    abortRef.current = null;
  }, []);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        resource ?? {
          subjectId: "",
          title: "",
          type: "PDF",
          license: undefined,
          visibility: "enrolled",
        }
      );
      resetUploadState();
    }
  }, [open, resource, form, resetUploadState]);

  // Rời màn giữa lượt tải (đổi route…) → cắt lượt, đừng để vòng lặp bắn tiếp vào hư không.
  useEffect(() => () => abortRef.current?.abort(), []);

  const submitting = phase !== "idle";
  const okText = isEdit ? "Lưu" : "Tạo";

  const handleClose = () => {
    if (submitting) return; // không đóng giữa chừng khi đang lưu/upload
    onClose();
  };

  /** Chờ được HUỶ ngay (nút "Dừng") + đếm ngược để admin thấy modal đang chờ nhịp chứ không treo. */
  const sleepCancellable = useCallback(
    (ms: number, signal: AbortSignal) =>
      new Promise<void>((resolve) => {
        const endAt = Date.now() + ms;
        let timer: number | null = null;
        const finish = () => {
          if (timer !== null) window.clearTimeout(timer);
          signal.removeEventListener("abort", finish);
          setWaitSeconds(0);
          resolve();
        };
        const tick = () => {
          const left = endAt - Date.now();
          if (signal.aborted || left <= 0) {
            finish();
            return;
          }
          setWaitSeconds(Math.ceil(left / 1000));
          timer = window.setTimeout(tick, Math.min(400, left));
        };
        signal.addEventListener("abort", finish, { once: true });
        tick();
      }),
    []
  );

  /**
   * Nạp album cho học liệu FE: tuần tự, giữ nhịp dưới rate limit của BE (10 ảnh/phút, 60 ảnh/giờ),
   * lùi-thử-lại khi 429, dừng được giữa chừng. Trả về số ảnh đã nạp và lượt có trọn vẹn không —
   * chưa trọn thì modal ở lại để bấm nạp tiếp.
   */
  const runAlbumUpload = async (
    resourceId: string
  ): Promise<{ completed: boolean; uploaded: number; total: number }> => {
    const pending = pendingRef.current;
    const resuming = Boolean(pending && pending.resourceId === resourceId);
    const items = resuming ? (pending as PendingAlbumRun).items : albumPlan?.items ?? [];
    const baseCount = resuming ? (pending as PendingAlbumRun).baseCount : albumTotal;
    if (items.length === 0) {
      pendingRef.current = null;
      return { completed: true, uploaded: 0, total: 0 };
    }

    let cursor = resuming ? (pending as PendingAlbumRun).uploaded : 0;
    if (resuming) {
      // Đối chiếu SỰ THẬT của server: một tấm có thể đã nạp xong nhưng response mất giữa đường —
      // tin con trỏ cục bộ sẽ nạp trùng, tin server thì không.
      try {
        const serverAlbum = await fetchFeAlbum(resourceId);
        cursor = Math.min(items.length, Math.max(cursor, serverAlbum.total - baseCount));
      } catch {
        // Đọc album lỗi → dùng con trỏ cục bộ; xấu nhất là một ảnh trùng, còn hơn dừng cả lượt.
      }
    }
    if (cursor >= items.length) {
      pendingRef.current = null;
      return { completed: true, uploaded: items.length, total: items.length };
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("uploading");
    setPercent(Math.round((cursor / items.length) * 100));

    const remaining = items.slice(cursor);

    // Ba chế độ, MỘT bộ chạy: khác nhau ở "một bước gửi bao nhiêu file và gửi đi đâu", còn nhịp
    // chống rate-limit, lùi-thử-lại khi 429, huỷ giữa chừng và con trỏ nạp-tiếp thì dùng chung.
    //
    // Hai đường số hoá gửi theo LÔ vì mỗi file là một lượt gọi model chạy tuần tự: gửi từng file
    // một sẽ trả thêm một vòng HTTP cho mỗi trang mà không nhanh hơn, còn gom quá tay thì ăn
    // timeout ở ingress. Trần lô lấy đúng con số BE đang chốt.
    const steps =
      albumMode === "image"
        ? remaining.map((item) => ({ items: [item], path: item.path }))
        : batchFeUploadItems(
            remaining,
            albumMode === "image-text" ? FE_IMAGE_TEXT_FILES_PER_REQUEST : FE_TEXT_FILES_PER_REQUEST
          );

    const result = await runFeAlbumUpload(steps, {
      weightOf: (step) => step.items.length,
      upload: async (step) => {
        if (albumMode === "image") {
          const item = step.items[0];
          await uploadFeAlbumImage({
            resourceId,
            file: item.file,
            mimeType: item.mimeType,
            signal: controller.signal,
          });
          return;
        }
        const files = step.items.map((item) => item.file);
        const send = albumMode === "image-text" ? uploadFeImageTextItems : uploadFeTextItems;
        const res = await send({ resourceId, files, signal: controller.signal });
        // BE trả 200 kể cả khi vài file trong lô hỏng. Nuốt `failed` ở đây là báo "đã nạp N trang"
        // cho một con số không đúng, và người soạn chỉ phát hiện khi đếm lại album.
        if (res.failed.length > 0) {
          throw new Error(
            res.failed.map((f) => `${f.filename}: ${f.reason}`).join("; ")
          );
        }
      },
      sleep: (ms) => sleepCancellable(ms, controller.signal),
      isCancelled: () => controller.signal.aborted,
      onProgress: (progress) => {
        const done = cursor + progress.uploaded;
        setAlbumRun({
          ...progress,
          index: cursor + progress.index,
          total: items.length,
          uploaded: done,
        });
        setPercent(Math.round((done / items.length) * 100));
      },
    });

    const landed = cursor + result.uploaded;
    abortRef.current = null;
    setAlbumRun(null);
    setWaitSeconds(0);
    setPercent(Math.round((landed / items.length) * 100));

    if (result.outcome === "done") {
      pendingRef.current = null;
      return { completed: true, uploaded: landed, total: items.length };
    }

    // Dừng hoặc thua: nhớ chỗ đang dở để bấm lại là nạp TIẾP, và nói thẳng đã nạp được bao nhiêu.
    pendingRef.current = { resourceId, items, baseCount, uploaded: landed };
    const tail = ` Đã tải ${landed}/${items.length} ảnh — bấm “${okText}” để nạp tiếp từ ảnh ${landed + 1}.`;
    setErrorMsg(
      result.outcome === "cancelled"
        ? `Đã dừng tải album.${tail}`
        : `${albumErrorMessage(result.error)}${tail}`
    );
    return { completed: false, uploaded: landed, total: items.length };
  };

  const handleFinish = async (values: ResourceFormValues) => {
    setErrorMsg(null);
    const subjectId = forcedSubjectId ?? values.subjectId;
    try {
      // 1) Lưu metadata (tạo hoặc cập nhật) → có resourceId.
      setPhase("saving");
      let resourceId = resource?.id ?? createdIdRef.current ?? undefined;
      if (isEdit) {
        await updateResource.mutateAsync({ ...values, subjectId });
      } else if (createdIdRef.current) {
        // Học liệu đã tạo ở lần bấm trước (upload lỗi) → dùng lại id, KHÔNG tạo trùng.
        resourceId = createdIdRef.current;
      } else {
        const created = await createResource.mutateAsync({ ...values, subjectId });
        createdIdRef.current = created.id;
        resourceId = created.id;
      }

      // 2) Nội dung. FE = album ảnh (từng ảnh một request); loại khác = 1 phiên bản file đơn.
      //    Thứ tự tạo-rồi-nạp giữ nguyên; luồng submit/approve KHÔNG đụng tới.
      let successNote = "";
      if (isFeAlbum) {
        if (resourceId) {
          const run = await runAlbumUpload(resourceId);
          if (!run.completed) {
            setPhase("idle"); // giữ modal mở để admin nạp tiếp hoặc đóng chủ động
            return;
          }
          if (run.uploaded > 0) successNote = ` — đã tải ${run.uploaded} ảnh vào album`;
        }
      } else if (file && resourceId) {
        setPhase("uploading");
        setPercent(0);
        const note = changelog.trim();
        await uploadFile.mutateAsync({
          resourceId,
          file,
          filename: file.name,
          mimeType: guessMime(file),
          ...(note ? { changelog: note } : {}),
          onProgress: setPercent,
        });
      }

      message.success((isEdit ? "Đã cập nhật học liệu" : "Đã tạo học liệu") + successNote);
      setPhase("idle");
      resetUploadState();
      onSaved?.();
      onClose();
    } catch (err) {
      setPhase("idle");
      setErrorMsg(isFeAlbum ? albumErrorMessage(err) : adminErrorMessage(err));
    }
  };

  const albumHint = (): string => {
    if (albumCapacity === 0) {
      return `Album đã đủ ${albumTotal}/${albumMax} ảnh — xoá bớt ảnh trước khi thêm.`;
    }
    if (!albumPlan) {
      const existing = isEdit ? `Album hiện có ${albumTotal}/${albumMax} ảnh, còn ${albumCapacity} chỗ. ` : "";
      return `${existing}Chọn cả thư mục ảnh đề thi (png/jpeg/webp, tối đa ${albumMax} ảnh, mỗi ảnh ≤10MB). Mỗi ảnh là một trang của album, thứ tự theo tên tệp.`;
    }
    if (albumPlan.items.length === 0) {
      return `Không có ảnh hợp lệ nào trong ${albumPlan.picked} tệp đã chọn.`;
    }
    return `${albumPlan.items.length} ảnh sẽ tải theo thứ tự tên · ước tính ${formatDuration(
      estimateUploadSeconds(albumPlan.items.length)
    )} (máy chủ giới hạn 10 ảnh/phút nên phải tải chậm).`;
  };

  return (
    <Modal
      title={isEdit ? "Sửa học liệu" : "Upload học liệu"}
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText={submitting ? (phase === "uploading" ? "Đang upload…" : "Đang lưu…") : okText}
      maskClosable={!submitting}
      keyboard={!submitting}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} disabled={submitting}>
        <Form.Item name="subjectId" label="Môn học" rules={[{ required: true, message: "Chọn môn học" }]}>
          <SubjectSelect placeholder="Chọn môn học" disabled={isEdit || subjectLocked} />
        </Form.Item>
        <Form.Item name="title" label="Tên học liệu" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
          <Select
            options={RESOURCE_TYPE_OPTIONS}
            onChange={() => {
              // Đổi loại → xoá lựa chọn file/thư mục cũ (album FE và file đơn là hai luồng khác hẳn).
              setFile(null);
              setFolderFiles([]);
              setPercent(0);
              pendingRef.current = null;
            }}
          />
        </Form.Item>
        <Form.Item name="license" label="License">
          <Select
            allowClear
            placeholder="Chọn giấy phép (tuỳ chọn)"
            options={RESOURCE_LICENSE_OPTIONS}
          />
        </Form.Item>
        <Form.Item
          name="visibility"
          label="Visibility"
          rules={[{ required: true }]}
          extra="“Học viên đã mua” khoá học liệu với người chưa mua khoá liên kết (hiện lock badge)."
        >
          <Select
            options={RESOURCE_VISIBILITY_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
              title: o.description,
            }))}
            optionRender={(opt) => (
              <div>
                <div>{opt.data.label}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {RESOURCE_VISIBILITY_OPTIONS.find((o) => o.value === opt.data.value)?.description}
                </Typography.Text>
              </div>
            )}
          />
        </Form.Item>

        <Form.Item label={isFeAlbum ? "Ảnh album FE" : "Tệp"}>
          {isFeAlbum ? (
            !canManageAlbum ? (
              <Alert
                type="info"
                showIcon
                message="Không thể thêm ảnh vào album"
                description="Chỉ chủ học liệu hoặc người duyệt môn mới thêm được ảnh vào album FE. Bạn vẫn có thể sửa thông tin."
              />
            ) : (
              <>
                <input
                  ref={setFolderInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    setFolderFiles(Array.from(e.target.files ?? []));
                    pendingRef.current = null; // chọn lại thư mục = lượt tải mới
                    setPercent(0);
                    setErrorMsg(null);
                  }}
                />
                <Space direction="vertical" style={{ width: "100%" }}>
                  {/*
                    Chọn ĐƯỜNG NẠP trước khi chọn file: ba đường cho ra ba loại trang khác nhau và
                    một trong ba (số hoá) KHÔNG giữ lại ảnh gốc, nên đây là quyết định của người
                    soạn theo dạng bản gốc đang có — không phải thứ nên đoán hộ.
                  */}
                  <Radio.Group
                    value={albumMode}
                    onChange={(e) => {
                      setAlbumMode(e.target.value as FeUploadMode);
                      // Đổi chế độ = đổi luật lọc file → kế hoạch cũ không còn đúng.
                      setFolderFiles([]);
                      pendingRef.current = null;
                      setPercent(0);
                      setErrorMsg(null);
                    }}
                    disabled={submitting}
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { label: "Ảnh giữ nguyên", value: "image" },
                      { label: "Ảnh → chữ (AI)", value: "image-text" },
                      { label: "Tệp .txt/.md", value: "text" },
                    ]}
                  />
                  <Typography.Text type="secondary">{albumModeHint(albumMode)}</Typography.Text>
                  <Button
                    icon={<InboxOutlined />}
                    onClick={() => folderInputRef.current?.click()}
                    disabled={submitting || albumCapacity === 0}
                  >
                    {albumMode === "text" ? "Chọn thư mục tệp đề" : "Chọn thư mục ảnh"}
                  </Button>
                  <Typography.Text type="secondary">{albumHint()}</Typography.Text>
                  {albumWarnings.length > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Một số tệp sẽ KHÔNG được tải"
                      description={
                        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                          {albumWarnings.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                </Space>
              </>
            )
          ) : !canUploadVersion ? (
            <Alert
              type="info"
              showIcon
              message="Không thể tải phiên bản mới"
              description="Chỉ người đã tạo học liệu này mới được tải phiên bản mới. Bạn vẫn có thể sửa thông tin."
            />
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} disabled={submitting}>
                  Chọn tệp
                </Button>
                <Typography.Text type="secondary">
                  {file ? file.name : isEdit ? "Chọn tệp để tạo phiên bản mới (tuỳ chọn)." : "Chọn tệp để upload (tuỳ chọn)."}
                </Typography.Text>
              </Space>
            </>
          )}
        </Form.Item>

        {canUploadVersion && !isFeAlbum && (
          <Form.Item label="Ghi chú phiên bản (tuỳ chọn)">
            <Input.TextArea
              rows={2}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="Mô tả thay đổi của phiên bản này (hiển thị ở lịch sử phiên bản)."
              disabled={submitting}
              maxLength={500}
            />
          </Form.Item>
        )}

        {phase === "uploading" && (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Progress percent={percent} status="active" />
            {albumRun && (
              <>
                <Typography.Text type="secondary">{albumRunText(albumRun, waitSeconds)}</Typography.Text>
                {/* disabled={false}: Form disabled={submitting} truyền context xuống mọi Button —
                    nút DỪNG là thứ duy nhất phải bấm được giữa lượt tải. */}
                <Button size="small" danger disabled={false} onClick={() => abortRef.current?.abort()}>
                  Dừng tải album
                </Button>
              </>
            )}
          </Space>
        )}

        {errorMsg && (
          <Alert type="error" showIcon message="Thao tác thất bại" description={errorMsg} style={{ marginTop: 8 }} />
        )}
      </Form>
    </Modal>
  );
}
