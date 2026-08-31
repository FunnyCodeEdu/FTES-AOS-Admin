import { useState } from "react";
import { Button, Card, Input, Space, Tag, Typography } from "antd";
import { ScissorOutlined } from "@ant-design/icons";
import { useIsMobile } from "../../../../shared/hooks/useIsMobile";
import { ClipRangeEditor } from "./ClipRangeEditor";
import { formatMmSs, isValidClipRange, parseMmSs } from "../timecode";
import type { HighlightSuggestion } from "../types";

export interface HighlightSuggestionCardProps {
  suggestion: HighlightSuggestion;
  videoDurationMs?: number | null;
  cutting: boolean;
  onCut: (values: { suggestionId: string; startMs: number; endMs: number; title: string }) => void;
}

/**
 * MỘT đề xuất của AI: tiêu đề, lý do chọn, mốc vào/ra SỬA ĐƯỢC, nút "Cắt clip".
 *
 * <p>Là component riêng cho mỗi đề xuất (không phải một hàm render trong vòng lặp) vì mỗi thẻ giữ
 * state gõ dở của riêng nó — cùng lý do `RowStatusControl` của trang lương tách ra thành component.
 *
 * <p>Mốc AI trả về CHỈ là gợi ý: nó đọc transcript nên hay bắt đầu giữa câu. Cho sửa ngay tại chỗ
 * rẻ hơn nhiều so với cắt ra rồi mới phát hiện lệch và phải xoá clip làm lại.
 */
export function HighlightSuggestionCard({
  suggestion,
  videoDurationMs,
  cutting,
  onCut,
}: HighlightSuggestionCardProps) {
  const isMobile = useIsMobile();
  const [startText, setStartText] = useState(() => formatMmSs(suggestion.startMs));
  const [endText, setEndText] = useState(() => formatMmSs(suggestion.endMs));
  const [title, setTitle] = useState(suggestion.title ?? "");

  const startMs = parseMmSs(startText);
  const endMs = parseMmSs(endText);
  const canCut =
    startMs != null &&
    endMs != null &&
    isValidClipRange(startMs, endMs, videoDurationMs) &&
    title.trim().length > 0;

  const cutButton = (
    <Button
      type="primary"
      icon={<ScissorOutlined />}
      disabled={!canCut}
      loading={cutting}
      block={isMobile}
      size={isMobile ? "large" : "middle"}
      onClick={() =>
        onCut({
          suggestionId: suggestion.id,
          startMs: startMs as number,
          endMs: endMs as number,
          title: title.trim(),
        })
      }
    >
      Cắt clip
    </Button>
  );

  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space wrap size={8} align="center">
          {suggestion.rank != null && <Tag color="blue">#{suggestion.rank}</Tag>}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            AI đề xuất {formatMmSs(suggestion.startMs)} → {formatMmSs(suggestion.endMs)}
          </Typography.Text>
        </Space>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề clip"
          maxLength={160}
          aria-label="Tiêu đề clip"
        />

        {suggestion.reason && (
          <Typography.Paragraph
            type="secondary"
            style={{ marginBottom: 0, fontSize: 13 }}
            ellipsis={{ rows: 3, expandable: true, symbol: "xem thêm" }}
          >
            {suggestion.reason}
          </Typography.Paragraph>
        )}

        <ClipRangeEditor
          startText={startText}
          endText={endText}
          onChangeStart={setStartText}
          onChangeEnd={setEndText}
          videoDurationMs={videoDurationMs}
          disabled={cutting}
        />

        <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-end" }}>
          {cutButton}
        </div>
      </Space>
    </Card>
  );
}
