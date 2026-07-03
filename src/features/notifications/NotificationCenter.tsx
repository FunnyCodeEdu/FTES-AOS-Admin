import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  Empty,
  List,
  Progress,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
  App,
} from "antd";
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { queryClient } from "../../shared/api/queryClient";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useRunningTasks,
  useUnreadCount,
  type AsyncTask,
  type NotificationItem,
} from "./api";

const PERMISSION_CHANGED_TYPE = "PERMISSION_CHANGED";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

interface NotificationListProps {
  items: NotificationItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onClose: () => void;
}

function NotificationList({
  items,
  isLoading,
  isError,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  onClose,
}: NotificationListProps) {
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  if (isError) {
    return (
      <Empty
        description={error?.message ?? "Không thể tải thông báo"}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button onClick={() => fetchNextPage()}>Thử lại</Button>
      </Empty>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 12, textAlign: "right" }}>
        <Button
          size="small"
          onClick={() => markAllRead.mutate(undefined, { onSuccess: onClose })}
          disabled={items.every((n) => n.readAt)}
        >
          Đánh dấu đã đọc tất cả
        </Button>
      </div>
      <List
        dataSource={items}
        locale={{ emptyText: "Không có thông báo" }}
        loadMore={
          hasNextPage ? (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Button loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
                Tải thêm
              </Button>
            </div>
          ) : null
        }
        renderItem={(item) => (
          <List.Item
            style={{
              background: item.readAt ? undefined : "rgba(63,81,181,0.05)",
              padding: 12,
              borderRadius: 8,
              marginBottom: 8,
              cursor: "pointer",
            }}
            onClick={() => !item.readAt && markRead.mutate(item.id)}
          >
            <List.Item.Meta
              title={
                <Space>
                  {item.title}
                  {!item.readAt && <Tag color="blue">Mới</Tag>}
                </Space>
              }
              description={
                <>
                  <Typography.Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 4 }}
                  >
                    {item.body}
                  </Typography.Paragraph>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {formatTime(item.createdAt)}
                  </Typography.Text>
                </>
              }
            />
          </List.Item>
        )}
      />
    </>
  );
}

function TaskList() {
  const { data, isLoading, isError, error } = useRunningTasks();
  const items = data?.items ?? [];

  if (isLoading) return <Skeleton active paragraph={{ rows: 3 }} />;
  if (isError)
    return (
      <Empty
        description={error?.message ?? "Không thể tải tác vụ"}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );

  return (
    <List
      dataSource={items}
      locale={{ emptyText: "Không có tác vụ đang chạy" }}
      renderItem={(task: AsyncTask) => (
        <List.Item>
          <List.Item.Meta
            avatar={
              task.status === "running" ? (
                <LoadingOutlined />
              ) : task.status === "completed" ? (
                <CheckCircleOutlined style={{ color: "#52c41a" }} />
              ) : (
                <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
              )
            }
            title={task.label}
            description={
              <>
                <Typography.Text type="secondary">{task.kind}</Typography.Text>
                {task.status === "running" && (
                  <div style={{ marginTop: 4 }}>
                    <Progress percent={task.progress} size="small" />
                  </div>
                )}
              </>
            }
          />
        </List.Item>
      )}
    />
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const { data: tasksData } = useRunningTasks();
  const { notification } = App.useApp();

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const unreadCount = unreadData?.unreadCount ?? 0;
  const previousItemsRef = useRef<NotificationItem[]>([]);
  const previousTasksRef = useRef<AsyncTask[]>([]);

  useEffect(() => {
    const previous = previousItemsRef.current;
    const previousIds = new Set(previous.map((n) => n.id));
    const newItems = items.filter((n) => !previousIds.has(n.id));

    if (newItems.length > 0) {
      notification.info({ message: "Thông báo mới", placement: "bottomRight" });

      const hasPermissionChange = newItems.some(
        (n) => n.type === PERMISSION_CHANGED_TYPE
      );
      if (hasPermissionChange) {
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    }

    previousItemsRef.current = items;
  }, [items, notification]);

  useEffect(() => {
    const current = tasksData?.items ?? [];
    const previous = previousTasksRef.current;
    const currentIds = new Set(current.map((t) => t.id));
    const finished = previous.filter((t) => !currentIds.has(t.id));

    for (const task of finished) {
      notification.success({
        message: `Tác vụ "${task.label}" đã hoàn thành`,
        placement: "bottomRight",
      });
    }

    previousTasksRef.current = current;
  }, [tasksData, notification]);

  return (
    <>
      <Badge count={unreadCount} size="small">
        <Button
          type="text"
          icon={<BellOutlined />}
          onClick={() => setOpen(true)}
          aria-label="Thông báo"
        />
      </Badge>
      <Drawer
        title="Trung tâm thông báo"
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={400}
      >
        <Tabs
          items={[
            {
              key: "notifications",
              label: `Thông báo ${unreadCount > 0 ? `(${unreadCount})` : ""}`,
              children: (
                <NotificationList
                  items={items}
                  isLoading={isLoading}
                  isError={isError}
                  error={error}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onClose={() => setOpen(false)}
                />
              ),
            },
            {
              key: "tasks",
              label: "Tác vụ",
              children: <TaskList />,
            },
          ]}
        />
      </Drawer>
    </>
  );
}
