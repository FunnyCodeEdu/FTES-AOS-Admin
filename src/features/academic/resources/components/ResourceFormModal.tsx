import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Input, Modal, Progress, Select, Space, Typography, message } from "antd";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import JSZip from "jszip";
import { SubjectSelect } from "../../components/SubjectSelect";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { RESOURCE_LICENSE_OPTIONS, RESOURCE_TYPE_OPTIONS } from "../constants";
import { useMe } from "../../../auth/api";
import { useCreateResource, useUpdateResource, useUploadResourceFile } from "../api/resources.api";
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

const MAX_FE_ZIP_BYTES = 100 * 1024 * 1024; // FE folder → zip application/zip tối đa 100MB (C-3).

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

/** Nén danh sách file (giữ đường dẫn tương đối của thư mục) thành 1 Blob application/zip. */
async function zipFolder(files: File[]): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    zip.file(rel, f);
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
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

  const { data: me } = useMe();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource(resource?.id);
  const uploadFile = useUploadResourceFile();

  // BE (ResourceService.uploadVersion, owner-only qua ResourceGuard.isOwner) chỉ cho CHÍNH chủ
  // upload (uploaderId == currentUserId) — approver/moderator vẫn bị 403. Nên chỉ mở ô chọn file
  // khi tạo mới hoặc khi sửa học liệu do CHÍNH mình tạo. Không rõ id mình (me chưa load) thì KHÔNG
  // chặn nhầm.
  const canUploadVersion =
    !isEdit || !resource?.createdBy || !me?.user?.id || me.user.id === resource.createdBy;

  const [file, setFile] = useState<File | null>(null);
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [changelog, setChangelog] = useState("");
  const [phase, setPhase] = useState<"idle" | "saving" | "uploading">("idle");
  const [percent, setPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  // Giữ id học liệu vừa tạo để nếu bước upload lỗi, bấm "Tạo" lại KHÔNG tạo trùng học liệu mới.
  const createdIdRef = useRef<string | null>(null);

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
    createdIdRef.current = null;
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

  const submitting = phase !== "idle";

  const handleClose = () => {
    if (submitting) return; // không đóng giữa chừng khi đang lưu/upload
    onClose();
  };

  /** Chuẩn bị dữ liệu upload theo loại: FE = zip thư mục; còn lại = file đơn. Không chọn gì → null. */
  const resolveUpload = async (
    resourceType: ResourceType | undefined,
    title: string
  ): Promise<{ blob: Blob; filename: string; mimeType: string } | null> => {
    if (resourceType === "FE") {
      if (folderFiles.length === 0) return null;
      const blob = await zipFolder(folderFiles);
      if (blob.size > MAX_FE_ZIP_BYTES) {
        throw new Error("Thư mục sau khi nén vượt 100MB — vui lòng giảm dung lượng.");
      }
      const safe = (title || "folder").replace(/[^\w.-]+/g, "_");
      return { blob, filename: `${safe}.zip`, mimeType: "application/zip" };
    }
    if (!file) return null;
    return {
      blob: file,
      filename: file.name,
      mimeType: guessMime(file),
    };
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

      // 2) Upload phiên bản (nếu có chọn file/thư mục) qua endpoint multipart 1 bước.
      const upload = await resolveUpload(values.type, values.title);
      if (upload && resourceId) {
        setPhase("uploading");
        setPercent(0);
        const note = changelog.trim();
        await uploadFile.mutateAsync({
          resourceId,
          file: upload.blob,
          filename: upload.filename,
          mimeType: upload.mimeType,
          ...(note ? { changelog: note } : {}),
          onProgress: setPercent,
        });
      }

      message.success(isEdit ? "Đã cập nhật học liệu" : "Đã tạo học liệu");
      setPhase("idle");
      resetUploadState();
      onSaved?.();
      onClose();
    } catch (err) {
      setPhase("idle");
      setErrorMsg(adminErrorMessage(err));
    }
  };

  const isFolder = type === "FE";
  const okText = isEdit ? "Lưu" : "Tạo";

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
              // Đổi loại → xoá lựa chọn file/thư mục cũ (tránh gửi nhầm zip cho loại file đơn).
              setFile(null);
              setFolderFiles([]);
              setPercent(0);
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
        <Form.Item name="visibility" label="Visibility" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "public", label: "Công khai" },
              { value: "enrolled", label: "Học viên đăng ký" },
              { value: "package_only", label: "Theo gói" },
            ]}
          />
        </Form.Item>

        <Form.Item label={isFolder ? "Thư mục (nén .zip)" : "Tệp"}>
          {!canUploadVersion ? (
            <Alert
              type="info"
              showIcon
              message="Không thể tải phiên bản mới"
              description="Chỉ người đã tạo học liệu này mới được tải phiên bản mới. Bạn vẫn có thể sửa thông tin."
            />
          ) : isFolder ? (
            <>
              <input
                ref={setFolderInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => setFolderFiles(Array.from(e.target.files ?? []))}
              />
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button
                  icon={<InboxOutlined />}
                  onClick={() => folderInputRef.current?.click()}
                  disabled={submitting}
                >
                  Chọn thư mục
                </Button>
                <Typography.Text type="secondary">
                  {folderFiles.length > 0
                    ? `${folderFiles.length} tệp đã chọn — sẽ nén thành 1 file .zip (tối đa 100MB).`
                    : "Chọn cả thư mục; toàn bộ nội dung được nén .zip ở trình duyệt rồi upload."}
                </Typography.Text>
              </Space>
            </>
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

        {canUploadVersion && (
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

        {phase === "uploading" && <Progress percent={percent} status="active" />}

        {errorMsg && (
          <Alert type="error" showIcon message="Thao tác thất bại" description={errorMsg} style={{ marginTop: 8 }} />
        )}
      </Form>
    </Modal>
  );
}
