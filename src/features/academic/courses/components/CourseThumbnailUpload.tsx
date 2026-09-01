import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Image, Space, Typography, Upload, message } from "antd";
import type { UploadProps } from "antd";
import { useEffect, useMemo } from "react";

const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024;
const ALLOWED_THUMBNAIL_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Client check để báo sớm; backend vẫn soi lại MIME, dung lượng và magic bytes. */
export function validateCourseThumbnail(file: Pick<File, "size" | "type">): string | null {
  if (file.size <= 0) return "Ảnh không được rỗng";
  if (file.size > MAX_THUMBNAIL_BYTES) return "Ảnh tối đa 10MB";
  if (!ALLOWED_THUMBNAIL_MIME.has(file.type.toLowerCase())) {
    return "Chỉ chấp nhận ảnh PNG, JPG hoặc WebP";
  }
  return null;
}

interface CourseThumbnailUploadProps {
  value?: string | null;
  onChange?: (value: string) => void;
  file?: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function CourseThumbnailUpload({
  value,
  onChange,
  file,
  onFileChange,
  disabled,
}: CourseThumbnailUploadProps) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const beforeUpload: UploadProps["beforeUpload"] = (picked) => {
    const error = validateCourseThumbnail(picked);
    if (error) {
      message.error(error);
      return Upload.LIST_IGNORE;
    }
    onFileChange(picked as File);
    return Upload.LIST_IGNORE;
  };

  const shownUrl = previewUrl || value || null;

  return (
    <Space direction="vertical" size="small">
      {shownUrl ? (
        <Image
          src={shownUrl}
          alt="Thumbnail khoá học"
          width={240}
          height={135}
          style={{ objectFit: "cover", borderRadius: 8 }}
        />
      ) : (
        <div
          aria-label="Chưa có thumbnail khoá học"
          style={{
            width: 240,
            height: 135,
            border: "1px dashed #d9d9d9",
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            color: "#8c8c8c",
          }}
        >
          Chưa có ảnh
        </div>
      )}
      {!disabled && (
        <Space wrap>
          <Upload
            accept="image/png,image/jpeg,image/webp"
            maxCount={1}
            showUploadList={false}
            beforeUpload={beforeUpload}
          >
            <Button icon={<UploadOutlined />}>{shownUrl ? "Đổi ảnh" : "Tải ảnh"}</Button>
          </Upload>
          {shownUrl && (
            <Button
              icon={<DeleteOutlined />}
              onClick={() => {
                if (file) onFileChange(null);
                else onChange?.("");
              }}
            >
              {file ? "Bỏ ảnh đã chọn" : "Gỡ ảnh"}
            </Button>
          )}
        </Space>
      )}
      <Typography.Text type="secondary">
        PNG, JPG hoặc WebP · tối đa 10MB · tỉ lệ gợi ý 16:9 · tải lên khi bấm Tạo/Lưu
      </Typography.Text>
    </Space>
  );
}
