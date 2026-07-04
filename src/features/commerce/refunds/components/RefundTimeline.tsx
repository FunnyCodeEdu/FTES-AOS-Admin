import { Timeline, Typography } from "antd";
import dayjs from "dayjs";
import type { RefundTimelineItem } from "../../shared/types";

interface RefundTimelineProps {
  items: RefundTimelineItem[];
}

const STEP_LABELS: Record<string, string> = {
  requested: "Yêu cầu refund",
  approved: "Duyệt",
  rejected: "Từ chối",
  executed: "Thực thi",
  retry: "Thử lại",
};

export function RefundTimeline({ items }: RefundTimelineProps) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );

  return (
    <Timeline
      items={sorted.map((item) => ({
        children: (
          <div>
            <Typography.Text strong>{STEP_LABELS[item.step] ?? item.step}</Typography.Text>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(item.occurredAt).format("DD/MM/YYYY HH:mm:ss")} — {item.actorName}
              </Typography.Text>
            </div>
            {item.reason && (
              <Typography.Paragraph style={{ marginBottom: 0 }}>Lý do: {item.reason}</Typography.Paragraph>
            )}
            {item.note && (
              <Typography.Paragraph style={{ marginBottom: 0 }}>Ghi chú: {item.note}</Typography.Paragraph>
            )}
            {item.payoutChannel && (
              <Typography.Paragraph style={{ marginBottom: 0 }}>Kênh: {item.payoutChannel}</Typography.Paragraph>
            )}
            {item.errorMessage && (
              <Typography.Paragraph type="danger" style={{ marginBottom: 0 }}>
                Lỗi: {item.errorMessage}
              </Typography.Paragraph>
            )}
          </div>
        ),
      }))}
    />
  );
}
