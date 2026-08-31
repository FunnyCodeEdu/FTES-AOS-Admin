import { useState } from "react";
import { Button, Card, Input, Space, Tag, Typography } from "antd";
import { CheckOutlined, ScissorOutlined } from "@ant-design/icons";
import { useIsMobile } from "../../../../shared/hooks/useIsMobile";
import { ClipRangeEditor } from "./ClipRangeEditor";
import { formatMmSs, isValidClipRange, parseMmSs } from "../timecode";
import type { HighlightSuggestion } from "../types";

/** Giá trị một lần bấm "Cắt clip" — dùng chung cho `onCut` và cho chữ ký chống bấm lặp. */
export interface CutRequest {
  suggestionId: string;
  startMs: number;
  endMs: number;
  title: string;
}

/**
 * "Chữ ký" của một lần cắt: cùng mốc vào + mốc ra + tiêu đề ⇒ đúng cái vừa gửi đi, bấm nữa là tạo
 * clip TRÙNG. Ký bằng nội dung chứ không chỉ bằng `suggestionId` là có chủ ý: admin sửa lại mốc rồi
 * cắt lần nữa là một clip KHÁC, không được chặn.
 */
export function cutSignatureOf(values: Pick<CutRequest, "startMs" | "endMs" | "title">): string {
  return `${values.startMs}-${values.endMs}-${values.title.trim()}`;
}

export interface HighlightSuggestionCardProps {
  suggestion: HighlightSuggestion;
  videoDurationMs?: number | null;
  cutting: boolean;
  /**
   * Chữ ký của lần cắt GẦN NHẤT đã gửi thành công cho đúng đề xuất này (trang giữ, xem
   * `CreateClipPanel`). Trùng với chữ ký đang gõ ⇒ khoá nút lại.
   */
  lastCutSignature?: string | null;
  onCut: (values: CutRequest) => void;
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
  lastCutSignature,
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

  // Đã gửi cắt ĐÚNG khoảng này rồi. Cắt xong danh sách clip nằm ở tab khác nên tại đây không có gì
  // đổi ngoài một `message` thoáng qua — không khoá lại thì admin dễ tưởng bấm hụt, bấm phát nữa,
  // và thành hai job ffmpeg cho cùng một đoạn + hai dòng rác phải xoá tay (xoá còn bắt nhập lý do).
  const currentSignature =
    startMs != null && endMs != null ? cutSignatureOf({ startMs, endMs, title }) : null;
  const alreadyCut = currentSignature != null && currentSignature === lastCutSignature;

  const cutButton = (
    <Button
      type="primary"
      icon={alreadyCut ? <CheckOutlined /> : <ScissorOutlined />}
      disabled={!canCut || alreadyCut}
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
      {alreadyCut ? "Đã gửi cắt" : "Cắt clip"}
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
          {/* Dấu vết ở LẠI trên thẻ, khác `message` chớp một cái rồi biến — đó mới là thứ trả lời
              được câu "nãy mình bấm rồi hay chưa?". */}
          {alreadyCut && <Tag color="success">Đã gửi cắt — xem ở tab Studio</Tag>}
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
