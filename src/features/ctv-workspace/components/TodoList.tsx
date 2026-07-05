import { Badge, List, Typography } from "antd";
import { Link } from "react-router-dom";
import type { CtvTodoItem } from "../shared/types";

interface TodoListProps {
  items: CtvTodoItem[];
}

export function TodoList({ items }: TodoListProps) {
  if (items.length === 0) {
    return <Typography.Text type="secondary">Không có việc cần làm 🎉</Typography.Text>;
  }

  return (
    <List
      dataSource={items}
      renderItem={(item) => (
        <List.Item>
          <Link to={item.link}>
            <Badge count={item.count}>
              <Typography.Text>
                {item.type === "PENDING_POST" ? "Bài viết chờ duyệt" : "Học liệu chờ duyệt"} — {item.scopeName}
              </Typography.Text>
            </Badge>
          </Link>
        </List.Item>
      )}
    />
  );
}
