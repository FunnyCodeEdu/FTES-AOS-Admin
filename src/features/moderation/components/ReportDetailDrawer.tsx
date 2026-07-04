import { Drawer, List, Space, Tag, Timeline, Typography } from "antd";
import dayjs from "dayjs";
import type { Report } from "../../community/shared/types";

interface ReportDetailDrawerProps {
  report: Report | null;
  open: boolean;
  onClose: () => void;
}

export function ReportDetailDrawer({ report, open, onClose }: ReportDetailDrawerProps) {
  if (!report) return null;

  return (
    <Drawer open={open} onClose={onClose} title={`Report: ${report.targetTitle}`} width={560}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Text type="secondary">Loại: {report.targetType}</Typography.Text>
        <Typography.Text type="secondary">Mức độ: <Tag>{report.severity}</Tag></Typography.Text>
        <Typography.Text type="secondary">Trạng thái: <Tag>{report.status}</Tag></Typography.Text>
        {report.groupName && <Typography.Text type="secondary">Group: {report.groupName}</Typography.Text>}

        <Typography.Title level={5}>Nội dung bị report</Typography.Title>
        <Typography.Paragraph>{report.targetSnapshot}</Typography.Paragraph>

        <Typography.Title level={5}>Ngưởi report</Typography.Title>
        <List
          size="small"
          dataSource={report.reporters}
          renderItem={(r) => (
            <List.Item>
              <Typography.Text>
                {r.userName} — {r.reason} ({dayjs(r.reportedAt).format("DD/MM/YYYY HH:mm")})
              </Typography.Text>
            </List.Item>
          )}
        />

        <Typography.Title level={5}>Lịch sử xử lý</Typography.Title>
        <Timeline
          items={report.history.map((h) => ({
            children: (
              <div>
                <Typography.Text strong>{h.action}</Typography.Text>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(h.occurredAt).format("DD/MM/YYYY HH:mm")} — {h.actorName}
                  </Typography.Text>
                </div>
                {h.reason && <Typography.Text>{h.reason}</Typography.Text>}
              </div>
            ),
          }))}
        />
      </Space>
    </Drawer>
  );
}
