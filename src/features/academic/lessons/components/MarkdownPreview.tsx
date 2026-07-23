import { Divider } from "antd";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import "@uiw/react-md-editor/markdown-editor.css";

interface MarkdownPreviewProps {
  source: string;
}

const PREVIEW_MARKER = "<!-- ftes:preview-end -->";

/**
 * Render markdown THẬT (MDEditor.Markdown, cùng renderer với blog) — sanitize qua rehype-sanitize
 * để HTML lạ bị escape/strip (XSS-safe). Giữ cắt teaser tại `<!-- ftes:preview-end -->`: phần trước
 * marker = học thử, phần sau = nội dung đầy đủ, ngăn bởi divider "Hết phần học thử".
 */
export function MarkdownPreview({ source }: MarkdownPreviewProps) {
  const parts = source.split(PREVIEW_MARKER);
  const teaser = parts[0] ?? "";
  const rest = parts.slice(1).join(PREVIEW_MARKER);

  return (
    <div data-color-mode="light" style={{ padding: 16, background: "#fafafa", minHeight: 240 }}>
      <MDEditor.Markdown
        source={teaser}
        rehypePlugins={[[rehypeSanitize]]}
        style={{ background: "transparent" }}
      />
      {parts.length > 1 && (
        <>
          <Divider orientation="center" style={{ margin: "16px 0" }}>
            — Hết phần học thử —
          </Divider>
          <MDEditor.Markdown
            source={rest}
            rehypePlugins={[[rehypeSanitize]]}
            style={{ background: "transparent" }}
          />
        </>
      )}
    </div>
  );
}
