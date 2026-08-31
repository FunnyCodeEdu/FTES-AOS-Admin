import { Input, Space, Typography } from "antd";
import { useIsMobile } from "../../../../shared/hooks/useIsMobile";
import { checkClipRange, formatMmSs, parseMmSs } from "../timecode";

export interface ClipRangeEditorProps {
  /** Chuỗi người dùng đang gõ, dạng mm:ss. Giữ ở dạng CHUỖI để họ gõ dở dang mà ô không nhảy. */
  startText: string;
  endText: string;
  onChangeStart: (text: string) => void;
  onChangeEnd: (text: string) => void;
  /** Biết thì truyền vào để chặn luôn mốc ra vượt quá video; không biết thì bỏ trống. */
  videoDurationMs?: number | null;
  disabled?: boolean;
}

/**
 * Hai ô mốc vào/ra dạng mm:ss + câu báo lỗi ngay dưới.
 *
 * <p>Vì sao không dùng `InputNumber` mili-giây: admin đang nhìn thanh thời gian của video, họ nghĩ
 * bằng "1 phút 05", không phải 65000. Còn vì sao KHÔNG để form tự do rồi đẩy lên BE: khoảng sai
 * (end ≤ start, dài quá 3 phút) mà lọt xuống thì phải đi hết đường vòng core → service cắt video
 * mới nhận được 400, trong khi luật đó kiểm được tại chỗ.
 */
export function ClipRangeEditor({
  startText,
  endText,
  onChangeStart,
  onChangeEnd,
  videoDurationMs,
  disabled,
}: ClipRangeEditorProps) {
  const isMobile = useIsMobile();
  const startMs = parseMmSs(startText);
  const endMs = parseMmSs(endText);

  // Chưa gõ xong (một trong hai ô chưa đọc được) thì báo "định dạng", chưa vội nói về khoảng.
  const parseIssue =
    startMs == null || endMs == null ? "Nhập mốc dạng mm:ss (ví dụ 01:05)." : null;
  const rangeIssue =
    parseIssue == null ? checkClipRange(startMs as number, endMs as number, videoDurationMs) : null;
  const errorText = parseIssue ?? rangeIssue?.message ?? null;
  const lengthText =
    parseIssue == null && rangeIssue == null ? formatMmSs((endMs as number) - (startMs as number)) : null;

  const inputStyle = { width: isMobile ? "100%" : 92 } as const;

  return (
    <div>
      <Space
        wrap
        size={8}
        align="center"
        style={isMobile ? { width: "100%", display: "flex" } : undefined}
      >
        <Input
          size="small"
          value={startText}
          disabled={disabled}
          onChange={(e) => onChangeStart(e.target.value)}
          status={errorText ? "error" : undefined}
          style={inputStyle}
          aria-label="Mốc vào (mm:ss)"
          placeholder="mm:ss"
        />
        <Typography.Text type="secondary">→</Typography.Text>
        <Input
          size="small"
          value={endText}
          disabled={disabled}
          onChange={(e) => onChangeEnd(e.target.value)}
          status={errorText ? "error" : undefined}
          style={inputStyle}
          aria-label="Mốc ra (mm:ss)"
          placeholder="mm:ss"
        />
        {lengthText && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            dài {lengthText}
          </Typography.Text>
        )}
      </Space>
      {errorText && (
        <Typography.Text type="danger" style={{ display: "block", fontSize: 12, marginTop: 4 }}>
          {errorText}
        </Typography.Text>
      )}
    </div>
  );
}
