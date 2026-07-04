import { Timeline, Typography } from "antd";
import dayjs from "dayjs";
import type { PaymentTimelineEvent } from "../../shared/types";

interface PaymentTimelineProps {
  events: PaymentTimelineEvent[];
}

const EVENT_LABELS: Record<string, string> = {
  created: "Tạo order",
  webhook_received: "Nhận webhook",
  matched: "Đối soát khớp",
  completed: "Hoàn tất",
  failed: "Thất bại / Huỷ",
};

export function PaymentTimeline({ events }: PaymentTimelineProps) {
  const items = [...events]
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
    .map((e) => ({
      children: (
        <div>
          <Typography.Text strong>{EVENT_LABELS[e.event] ?? e.event}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(e.occurredAt).format("DD/MM/YYYY HH:mm:ss")}
            </Typography.Text>
          </div>
          {e.actorName && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Bởi: {e.actorName}
            </Typography.Text>
          )}
          {e.note && <Typography.Paragraph style={{ marginBottom: 0 }}>{e.note}</Typography.Paragraph>}
        </div>
      ),
    }));

  return <Timeline items={items} />;
}
