import { useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  Radio,
  Space,
  Table,
  Tag,
  Tree,
  Typography,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useMatrixByPermission, useMatrixByUser, useRbacUsers } from "../api";
import type { TreeDataNode } from "antd";
import type { MatrixEntry, MatrixByPermissionEntry } from "../types";

function buildPermissionTree(entries: MatrixEntry[] | undefined): TreeDataNode[] {
  if (!entries) return [];
  const domains = new Map<string, MatrixEntry[]>();
  for (const e of entries) {
    const parts = e.permission.split(".");
    const domain = parts[0] ?? "unknown";
    if (!domains.has(domain)) domains.set(domain, []);
    domains.get(domain)!.push(e);
  }
  return Array.from(domains.entries()).map(([domain, perms]) => ({
    key: domain,
    title: `${domain} (${perms.length})`,
    children: perms.map((p) => ({
      key: p.permission,
      title: (
        <span>
          {p.permission}{" "}
          {p.sources.map((s, i) => (
            <Tag key={i} color={s.type === "ROLE" ? "blue" : "purple"}>
              {s.type}: {s.name}
              {s.scope && ` (${s.scope.type} ${s.scope.name})`}
            </Tag>
          ))}
        </span>
      ),
    })),
  }));
}

export default function AccessMatrixPage() {
  const [mode, setMode] = useState<"user" | "permission">("user");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [selectedPermission, setSelectedPermission] = useState<string>();

  const { data: users } = useRbacUsers(userSearch, 1, 20);
  const { data: byUser } = useMatrixByUser(selectedUserId);
  const { data: byPermission } = useMatrixByPermission(selectedPermission);

  const permissionColumns = [
    { title: "User ID", dataIndex: "userId" },
    { title: "Email", dataIndex: "email" },
    { title: "Họ tên", dataIndex: "fullName" },
    {
      title: "Nguồn",
      render: (_: unknown, r: MatrixByPermissionEntry) => (
        <Tag color={r.source.type === "ROLE" ? "blue" : "purple"}>
          {r.source.type}: {r.source.name}
          {r.source.scope && ` (${r.source.scope.type} ${r.source.scope.name})`}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Ma trận quyền</Typography.Title>
      <Card>
        <Radio.Group
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{ marginBottom: 16 }}
        >
          <Radio.Button value="user">Theo user</Radio.Button>
          <Radio.Button value="permission">Theo permission</Radio.Button>
        </Radio.Group>

        {mode === "user" ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input
              placeholder="Tìm user (email/tên)"
              prefix={<SearchOutlined />}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              allowClear
            />
            <Space wrap>
              {users?.items.map((u) => (
                <Button
                  key={u.userId}
                  type={selectedUserId === u.userId ? "primary" : "default"}
                  onClick={() => setSelectedUserId(u.userId)}
                >
                  {u.fullName || u.email}
                </Button>
              ))}
            </Space>
            {selectedUserId ? (
              byUser && byUser.length > 0 ? (
                <Tree treeData={buildPermissionTree(byUser)} />
              ) : (
                <Empty description="User chưa có quyền nào" />
              )
            ) : (
              <Empty description="Chọn user để xem quyền" />
            )}
          </Space>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input
              placeholder="Nhập permission key"
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value)}
              allowClear
            />
            {selectedPermission ? (
              byPermission && byPermission.length > 0 ? (
                <Table
                  rowKey="userId"
                  columns={permissionColumns}
                  dataSource={byPermission}
                  pagination={false}
                />
              ) : (
                <Empty description="Chưa ai có quyền này" />
              )
            ) : (
              <Empty description="Nhập permission để tra cứu" />
            )}
          </Space>
        )}
      </Card>
    </div>
  );
}
