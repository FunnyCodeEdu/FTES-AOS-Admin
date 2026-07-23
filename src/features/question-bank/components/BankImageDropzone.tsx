import { useState } from "react";
import { Alert, Button, Progress, Space, Typography, Upload, message } from "antd";
import { InboxOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useUploadBankImages } from "../api/questionBank.api";

interface BankImageDropzoneProps {
  bankId: string;
  disabled?: boolean;
}

/** Cap số ảnh mỗi lô (BE chấp nhận ~≤50). */
const MAX_FILES = 50;
const ALLOWED_EXT = [".webp", ".png", ".jpg", ".jpeg"];
const ALLOWED_MIME = ["image/webp", "image/png", "image/jpeg"];

function isAllowedImage(file: File): boolean {
  const name = file.name.toLowerCase();
  const extOk = ALLOWED_EXT.some((e) => name.endsWith(e));
  const mimeOk = file.type ? ALLOWED_MIME.includes(file.type) : false;
  return extOk || mimeOk;
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Kéo-thả cả thư mục ảnh (`Upload.Dragger` directory + multiple). `beforeUpload` trả `false` để
 * KHÔNG cho AntD tự upload; gom `File[]` vào state (lọc webp/png/jpg, dedup, cap ~50), rồi một
 * request multipart duy nhất qua `useUploadBankImages`. Mirror `LessonVideoUpload`
 * (beforeUpload-return-false + FormData thủ công) nhưng POST vào API chính qua `coreClient`.
 */
export function BankImageDropzone({ bankId, disabled }: BankImageDropzoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const upload = useUploadBankImages(bankId, setProgress);

  const busy = upload.isPending;

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(isAllowedImage);
    const rejected = incoming.length - valid.length;

    setFiles((prev) => {
      const seen = new Set(prev.map(fileKey));
      const merged = [...prev];
      for (const f of valid) {
        const key = fileKey(f);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(f);
        }
      }
      const overflow = merged.length - MAX_FILES;
      const capped = overflow > 0 ? merged.slice(0, MAX_FILES) : merged;
      if (overflow > 0) {
        message.warning(`Chỉ nhận tối đa ${MAX_FILES} ảnh/lô — đã bỏ qua ${overflow} ảnh dư.`);
      }
      return capped;
    });

    if (rejected > 0) {
      message.warning(`Đã bỏ qua ${rejected} tệp không phải ảnh webp/png/jpg.`);
    }
  };

  // AntD gọi beforeUpload MỖI file; arg thứ 2 là toàn bộ lô đã chọn. Xử lý cả lô đúng MỘT lần
  // (ở file cuối) để tránh race khi cập nhật state theo từng file.
  const beforeUpload: UploadProps["beforeUpload"] = (file, batch) => {
    if (batch[batch.length - 1] === file) {
      addFiles(batch);
    }
    return false;
  };

  const handleUpload = () => {
    if (files.length === 0) return;
    setProgress(0);
    upload.mutate(files, {
      onSuccess: (items) => {
        message.success(`Đã tải lên ${items.length} ảnh — đang giải bằng AI…`);
        setFiles([]);
        setProgress(0);
      },
      onSettled: () => setProgress(0),
    });
  };

  const totalMb = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Upload.Dragger
        multiple
        directory
        accept={ALLOWED_EXT.join(",")}
        showUploadList={false}
        beforeUpload={beforeUpload}
        disabled={disabled || busy}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Kéo-thả cả thư mục ảnh đề bài vào đây</p>
        <p className="ant-upload-hint">
          Chấp nhận .webp, .png, .jpg — tối đa {MAX_FILES} ảnh mỗi lô. Ảnh sẽ được nén, tải lên
          và giải tự động bằng AI.
        </p>
      </Upload.Dragger>

      {files.length > 0 && (
        <Alert
          type="info"
          showIcon
          message={`Đã chọn ${files.length} ảnh (${totalMb.toFixed(1)} MB)`}
          action={
            <Space>
              <Button size="small" onClick={() => setFiles([])} disabled={busy}>
                Xoá danh sách
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={busy}
                onClick={handleUpload}
              >
                Tải lên & giải
              </Button>
            </Space>
          }
        />
      )}

      {busy && (
        <Progress percent={progress} size="small" status="active" />
      )}

      {busy && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Đang nén và tải một lô ảnh có thể mất tới ~2 phút — vui lòng không đóng trang.
        </Typography.Text>
      )}
    </Space>
  );
}
