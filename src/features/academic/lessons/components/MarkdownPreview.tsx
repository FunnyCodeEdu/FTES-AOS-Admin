import { Divider, Typography } from "antd";

interface MarkdownPreviewProps {
  source: string;
}

const PREVIEW_MARKER = "<!-- ftes:preview-end -->";

export function MarkdownPreview({ source }: MarkdownPreviewProps) {
  const parts = source.split(PREVIEW_MARKER);
  const teaser = parts[0] ?? "";
  const rest = parts.slice(1).join(PREVIEW_MARKER);

  return (
    <div style={{ padding: 16, background: "#fafafa", minHeight: 240 }}>
      <RenderParagraphs text={teaser} />
      {parts.length > 1 && (
        <>
          <Divider orientation="center" style={{ margin: "16px 0" }}>
            — Hết phần học thử —
          </Divider>
          <RenderParagraphs text={rest} />
        </>
      )}
    </div>
  );
}

function RenderParagraphs({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim());
  return (
    <>
      {lines.map((line, idx) =>
        line ? (
          <Typography.Paragraph key={idx} style={{ marginBottom: "0.5em" }}>
            {line}
          </Typography.Paragraph>
        ) : (
          <br key={idx} />
        )
      )}
    </>
  );
}
