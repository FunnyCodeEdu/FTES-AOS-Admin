import { useEffect, useState } from "react";
import { DatePicker, Empty, Form, Select, Skeleton, Table } from "antd";
import dayjs from "dayjs";
import { useSecurityLog } from "../api/users.api";
import type { SecurityLogFilterFormValues, SecurityLogParams } from "../types";

interface SecurityLogTabProps {
  userId: string;
}

const EVENT_TYPES = [
  { label: "Đăng nhập thất bại", value: "LOGIN_FAILED" },
  { label: "Đổi mật khẩu", value: "PASSWORD_CHANGED" },
  { label: "Khoá tài khoản", value: "ACCOUNT_LOCKED" },
  { label: "Mở khoá tài khoản", value: "ACCOUNT_UNLOCKED" },
  { label: "Thu hồi session", value: "SESSION_REVOKED" },
  { label: "Impersonate", value: "IMPERSONATED" },
];

export function SecurityLogTab({ userId }: SecurityLogTabProps) {
  const [form] = Form.useForm<SecurityLogFilterFormValues>();
  const [params, setParams] = useState<SecurityLogParams>({ page: 1, pageSize: 10 });
  const { data, isLoading } = useSecurityLog(userId, params);

  const handleValuesChange = (_changed: unknown, all: SecurityLogFilterFormValues) => {
    const range = all.range;
    setParams({
      eventType: all.eventType,
      from: range?.[0]?.toISOString(),
      to: range?.[1]?.toISOString(),
      page: 1,
      pageSize: params.pageSize,
    });
  };

  useEffect(() => {
    setParams((p) => ({ ...p, page: 1 }));
  }, [userId]);

  const columns = [
    { title: "Sự kiện", dataIndex: "eventType", render: (v: string) => EVENT_TYPES.find((e) => e.value === v)?.label || v },
    { title: "Thời gian", dataIndex: "timestamp", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm:ss") },
    { title: "Người thực hiện", dataIndex: "actor" },
    { title: "Lý do", dataIndex: "reason" },
  ];

  return (
    <div>
      <Form form={form} layout="inline" onValuesChange={handleValuesChange} style={{ marginBottom: 16 }}>
        <Form.Item name="eventType">
          <Select placeholder="Loại sự kiện" allowClear options={EVENT_TYPES} style={{ minWidth: 180 }} />
        </Form.Item>
        <Form.Item name="range">
          <DatePicker.RangePicker showTime />
        </Form.Item>
      </Form>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        <>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data?.items ?? []}
            pagination={{
              current: params.page,
              pageSize: params.pageSize,
              total: data?.total ?? 0,
              onChange: (page, pageSize) => setParams((p) => ({ ...p, page, pageSize })),
            }}
          />
          {(!data || data.items.length === 0) && <Empty description="Chưa có sự kiện bảo mật" />}
        </>
      )}
    </div>
  );
}
