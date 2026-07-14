import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import "@uiw/react-md-editor/markdown-editor.css";

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  height?: number;
}

// Wrapper around @uiw/react-md-editor. Preview runs through rehype-sanitize so
// unsafe HTML in the markdown is stripped/escaped rather than executed (XSS-safe).
export function MarkdownEditor({ value, onChange, height = 460 }: MarkdownEditorProps) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value ?? ""}
        onChange={(next) => onChange?.(next ?? "")}
        height={height}
        previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
      />
    </div>
  );
}
