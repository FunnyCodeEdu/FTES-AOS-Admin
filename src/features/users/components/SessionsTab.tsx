import { Button, Empty, Skeleton, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useSessions } from "../api/users.api";
import { Can } from "../../../shared/permissions";

interface SessionsTabProps {
  userId: string;
  selected: string[];
  onSelectionChange: (keys: string[]) => void;
  onRevokeClick: () => void;
}

export function SessionsTab({ userId, selected, onSelectionChange, onRevokeClick }: SessionsTabProps) {
  const { data, isLoading } = useSessions(userId);

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!data) return <Empty description="Không thể tải danh sách session" />;

  const columns = [
    { title: "Thiết bị", dataIndex: "device" },
    { title: "IP", dataIndex: "ip" },
    {
      title: "Hoạt động lần cuối",
      dataIndex: "lastActiveAt",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "",
      dataIndex: "current",
      render: (v: boolean) => v && <Tag color="blue">Hiện tại</Tag>,
    },
  ];

  return (
    <div>
      <Can permissions={["user.session_revoke"]}>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" danger disabled={selected.length === 0} onClick={onRevokeClick}>
            Thu hồi session đã chọn ({selected.length})
          </Button>
        </div>
      </Can>
      <Table
        rowKey="sessionId"
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => onSelectionChange(keys as string[]),
          getCheckboxProps: (record) => ({ disabled: record.current }),
        }}
        columns={columns}
        dataSource={data.items}
        pagination={false}
      />
      {data.items.length === 0 && <Empty description="Không có session đang hoạt động" />}
    </div>
  );
}
