import { useRef } from "react";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { PictureOutlined } from "@ant-design/icons";
import { message } from "antd";
import rehypeSanitize from "rehype-sanitize";
import "@uiw/react-md-editor/markdown-editor.css";
import { useUploadBlogMedia } from "../api/blog.api";

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  height?: number;
}

/**
 * Editor markdown cho blog (wrap @uiw/react-md-editor). Preview qua rehype-sanitize (XSS-safe).
 *
 * Chèn ảnh INLINE tại vị trí con trỏ: (1) nút "Tải ảnh" trên thanh công cụ mở hộp chọn file, (2) dán
 * ảnh từ clipboard, (3) kéo-thả file ảnh vào editor. Cả ba đều upload qua POST /blog/media rồi chèn
 * `![tên](secureUrl)` đúng chỗ đang gõ — người viết bỏ ảnh ở đâu thì ảnh nằm đó.
 */
export function MarkdownEditor({ value, onChange, height = 460 }: MarkdownEditorProps) {
  const upload = useUploadBlogMedia();
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTextarea = (): HTMLTextAreaElement | null =>
    containerRef.current?.querySelector("textarea") ?? null;

  /** Chèn `snippet` tại vị trí con trỏ trong textarea (fallback: nối cuối), rồi đặt lại con trỏ sau ảnh. */
  const insertAtCursor = (snippet: string) => {
    const cur = value ?? "";
    const ta = getTextarea();
    if (!ta) {
      onChange?.(cur + snippet);
      return;
    }
    const start = ta.selectionStart ?? cur.length;
    const end = ta.selectionEnd ?? start;
    onChange?.(cur.slice(0, start) + snippet + cur.slice(end));
    // Sau khi React re-render giá trị mới, đặt con trỏ NGAY SAU đoạn vừa chèn.
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const uploadAndInsert = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Chỉ chèn được ảnh (png/jpg/webp/gif).");
      return;
    }
    const alt = file.name.replace(/\.[^.]+$/, "");
    try {
      const { secureUrl } = await upload.mutateAsync(file);
      insertAtCursor(`\n![${alt}](${secureUrl})\n`);
    } catch {
      // handleAdminMutationError đã hiện notification.
    }
  };

  /** Command thanh công cụ: mở hộp chọn file để upload + chèn tại con trỏ. */
  const uploadImageCommand: commands.ICommand = {
    name: "upload-image",
    keyCommand: "upload-image",
    buttonProps: { "aria-label": "Tải ảnh lên", title: "Tải ảnh lên (chèn tại con trỏ)" },
    icon: <PictureOutlined />,
    execute: () => fileInputRef.current?.click(),
  };

  return (
    <div data-color-mode="light" ref={containerRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadAndInsert(f);
          e.target.value = ""; // cho phép chọn lại cùng file
        }}
      />
      <MDEditor
        value={value ?? ""}
        onChange={(next) => onChange?.(next ?? "")}
        height={height}
        commands={[...commands.getCommands(), commands.divider, uploadImageCommand]}
        previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
        textareaProps={{
          onPaste: (e) => {
            const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
              i.type.startsWith("image/")
            );
            const file = item?.getAsFile();
            if (file) {
              e.preventDefault();
              void uploadAndInsert(file);
            }
          },
          onDrop: (e) => {
            const file = Array.from(e.dataTransfer?.files ?? []).find((f) =>
              f.type.startsWith("image/")
            );
            if (file) {
              e.preventDefault();
              void uploadAndInsert(file);
            }
          },
        }}
      />
      {upload.isPending && (
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Đang tải ảnh lên…</div>
      )}
    </div>
  );
}
