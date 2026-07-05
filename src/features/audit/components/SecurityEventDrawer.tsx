import { Drawer, Descriptions, Empty, Skeleton, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import type { SecurityEvent } from "../shared/types";

interface SecurityEventDrawerProps {
  event: SecurityEvent | undefined;
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
}

function severityColor(severity: SecurityEvent["severity"]) {
  switch (severity) {
    case "critical":
      return "red";
    case "high":
      return "orange";
    case "medium":
      return "gold";
    case "low":
    default:
      return "blue";
  }
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[object]";
  }
}

export function SecurityEventDrawer({ event, open, onClose, isLoading }: SecurityEventDrawerProps) {
  const isNotFound = !isLoading && open && !event;

  return (
    <Drawer title="Chi tiết security event" width={640} open={open} onClose={onClose}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : isNotFound ? (
        <Empty description="Không tìm thấy sự kiện" />
      ) : event ? (
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="ID">{event.id}</Descriptions.Item>
          <Descriptions.Item label="Loại">
            <Tag>{event.type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Mức độ">
            <Tag color={severityColor(event.severity)}>{event.severity}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="User liên quan">
            <Link to={`/users/${event.userId}`}>{event.userName}</Link>
          </Descriptions.Item>
          {event.actorId && (
            <Descriptions.Item label="Thực hiện bởi">
              <Link to={`/users/${event.actorId}`}>{event.actorName ?? event.actorId}</Link>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="IP">{event.ip}</Descriptions.Item>
          <Descriptions.Item label="Thiết bị">{event.device}</Descriptions.Item>
          <Descriptions.Item label="Thời gian">{new Date(event.timestamp).toLocaleString("vi-VN")}</Descriptions.Item>
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <Descriptions.Item label="Metadata">
              {Object.entries(event.metadata).map(([key, value]) => (
                <div key={key}>
                  <Typography.Text strong>{key}:</Typography.Text> {formatValue(value)}
                </div>
              ))}
            </Descriptions.Item>
          )}
        </Descriptions>
      ) : null}
    </Drawer>
  );
}
