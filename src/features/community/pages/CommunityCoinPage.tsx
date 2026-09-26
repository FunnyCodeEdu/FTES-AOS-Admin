import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  List,
  Space,
  Tag,
  Typography,
} from "antd";
import { DollarCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { useUsers } from "../../users/api/users.api";
import { getUserStatusMeta } from "../../users/lib/userStatus";
import type { UserRow } from "../../users/types";
import { AdjustModal } from "../../commerce/wallets/components/AdjustModal";

const RESULT_LIMIT = 10;

export function shouldSearchMembers(value: string): boolean {
  return value.trim().length >= 2;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default function CommunityCoinPage() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const canSearch = shouldSearchMembers(debouncedSearch);
  const isSearchPending = search.trim() !== debouncedSearch;
  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      page: 1,
      pageSize: RESULT_LIMIT,
    }),
    [debouncedSearch],
  );
  const { data, isFetching, isError, error, refetch } = useUsers(params, {
    enabled: canSearch,
    keepPreviousData: false,
  });

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        <DollarCircleOutlined /> Cộng Fcoin cho thành viên
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Tìm nhanh theo tên, username hoặc email rồi cộng Fcoin ngay tại đây.
      </Typography.Paragraph>

      <Card>
        <Input
          size="large"
          allowClear
          autoFocus
          prefix={<SearchOutlined />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nhập tên, username hoặc email học viên"
          aria-label="Tìm thành viên để cộng Fcoin"
        />

        {!canSearch && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Nhập ít nhất 2 ký tự để tìm thành viên"
            style={{ marginBlock: 32 }}
          />
        )}

        {canSearch && isError && (
          <Alert
            type="error"
            showIcon
            style={{ marginTop: 16 }}
            message="Không thể tìm thành viên"
            description={error?.message}
            action={
              <Button size="small" onClick={() => refetch()}>
                Thử lại
              </Button>
            }
          />
        )}

        {canSearch && !isError && (
          <List
            style={{ marginTop: 16 }}
            loading={isFetching || isSearchPending}
            dataSource={isSearchPending ? [] : (data?.items ?? [])}
            locale={{ emptyText: "Không tìm thấy thành viên phù hợp" }}
            header={
              data && !isSearchPending ? (
                <Typography.Text type="secondary">
                  {data.total > RESULT_LIMIT
                    ? `Hiển thị ${RESULT_LIMIT} trong ${data.total} kết quả — nhập thêm ký tự để thu hẹp.`
                    : `${data.total} kết quả`}
                </Typography.Text>
              ) : null
            }
            renderItem={(user) => {
              const status = getUserStatusMeta(user.status);
              return (
                <List.Item
                  key={user.id}
                  actions={[
                    <Button
                      key="credit"
                      type="primary"
                      icon={<DollarCircleOutlined />}
                      onClick={() => setSelectedUser(user)}
                    >
                      Cộng Fcoin
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar src={user.avatarUrl}>
                        {user.fullName.charAt(0).toUpperCase()}
                      </Avatar>
                    }
                    title={user.fullName}
                    description={
                      <Space size={[8, 4]} wrap>
                        <Typography.Text type="secondary">{user.email}</Typography.Text>
                        <Tag color={status.color}>{status.label}</Tag>
                        {user.roleNames.map((role) => (
                          <Tag key={role}>{role}</Tag>
                        ))}
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      {selectedUser && (
        <AdjustModal
          userId={selectedUser.id}
          userLabel={selectedUser.fullName}
          open
          creditOnly
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
