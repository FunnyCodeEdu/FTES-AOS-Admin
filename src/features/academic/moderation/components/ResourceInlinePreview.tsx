import { useEffect, useState } from "react";
import { Alert, Button, Skeleton, Typography } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { useModerationResourcePreview } from "../api/moderation.api";

interface ResourceInlinePreviewProps {
  resourceId: string;
  /** Nút "tải bản gốc" cho định dạng không xem trước inline được (zip, office…). */
  onDownload: () => void;
  downloading: boolean;
}

/** Đọc blob text lười — chỉ khi thật là định dạng chữ, tránh nuốt RAM với file nhị phân lớn. */
function isTextMime(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript" ||
    mime === "application/x-yaml"
  );
}

function TextPreview({ blob }: { blob: Blob }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    // Chỉ đọc tối đa ~200KB đầu — đủ để duyệt, không treo với file chữ khổng lồ.
    blob
      .slice(0, 200_000)
      .text()
      .then((t) => alive && setText(t))
      .catch(() => alive && setText(null));
    return () => {
      alive = false;
    };
  }, [blob]);
  if (text == null) return <Skeleton active paragraph={{ rows: 6 }} />;
  return (
    <pre
      style={{
        maxHeight: 560,
        overflow: "auto",
        background: "rgba(0,0,0,0.03)",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
      {blob.size > 200_000 ? "\n\n… (đã cắt bớt, tải bản gốc để xem đầy đủ)" : ""}
    </pre>
  );
}

/**
 * Xem TRỰC TIẾP nội dung học liệu trong drawer duyệt — không phải tải về mở tay.
 * Tải blob 1 lần (đã watermark) rồi render theo `blob.type`:
 *  - PDF → <object> nhúng trình xem PDF của trình duyệt;
 *  - ảnh → <img>;
 *  - chữ (text/json/xml…) → <pre> (cắt 200KB đầu);
 *  - còn lại (zip, pptx, docx…) → thông báo + nút tải bản gốc.
 * ObjectURL được thu hồi khi blob đổi / unmount để không rò bộ nhớ.
 */
export function ResourceInlinePreview({
  resourceId,
  onDownload,
  downloading,
}: ResourceInlinePreviewProps) {
  const { data: blob, isLoading, isError, error, refetch } = useModerationResourcePreview(resourceId);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (isLoading) {
    return (
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Đang tải nội dung để xem trực tiếp…
        </Typography.Text>
        <Skeleton active paragraph={{ rows: 6 }} style={{ marginTop: 8 }} />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Không xem trước được nội dung"
        description={`${adminErrorMessage(error)} Bạn vẫn tải bản gốc để kiểm tra được.`}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  if (!blob || !url) return null;

  const mime = (blob.type || "").toLowerCase();

  if (mime === "application/pdf") {
    return (
      <object
        data={url}
        type="application/pdf"
        style={{ width: "100%", height: 560, border: "1px solid #f0f0f0", borderRadius: 8 }}
      >
        <Alert
          type="info"
          showIcon
          message="Trình duyệt không nhúng được PDF này"
          description="Dùng nút tải bản gốc bên dưới để mở."
        />
      </object>
    );
  }

  if (mime.startsWith("image/")) {
    return (
      <img
        src={url}
        alt="Xem trước học liệu"
        style={{
          maxWidth: "100%",
          maxHeight: 560,
          objectFit: "contain",
          border: "1px solid #f0f0f0",
          borderRadius: 8,
        }}
      />
    );
  }

  if (isTextMime(mime)) {
    return <TextPreview blob={blob} />;
  }

  return (
    <Alert
      type="info"
      showIcon
      message="Định dạng này không xem trước trực tiếp được"
      description={
        <span>
          {mime || "không rõ định dạng"} — tải bản gốc về để kiểm tra.
          <br />
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            loading={downloading}
            onClick={onDownload}
            style={{ paddingLeft: 0 }}
          >
            Tải bản gốc
          </Button>
        </span>
      }
    />
  );
}
