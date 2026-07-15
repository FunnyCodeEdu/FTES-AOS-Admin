import { useState } from "react";
import {
  Button,
  Card,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Form,
  message,
} from "antd";
import {
  CopyOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useCloneRole, useRoles } from "../api";
import { Can } from "../../../shared/permissions";
import type { Role } from "../types";

const PAGE_SIZE = 10;

export default function RoleListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cloneRole, setCloneRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const { data, isLoading } = useRoles(search, page, PAGE_SIZE);
  // Clone client-side: POST /rbac/roles với code+name mới, copy quyền từ role nguồn.
  const clone = useCloneRole(cloneRole);

  const columns = [
    {
      title: "Tên vai trò",
      dataIndex: "name",
      render: (name: string, record: Role) => (
        <Link to={`/system/rbac/roles/${record.id}`}>{name}</Link>
      ),
    },
    { title: "Mô tả", dataIndex: "description" },
    {
      title: "Preset",
      dataIndex: "isPreset",
      render: (isPreset: boolean, record: Role) =>
        isPreset ? (
          <Tag color="blue">{record.presetDomain ?? "preset"}</Tag>
        ) : (
          <Tag>Tuỳ chỉnh</Tag>
        ),
    },
    { title: "Số quyền", dataIndex: "permissionCount" },
    { title: "Số user", dataIndex: "userCount" },
    {
      title: "Thao tác",
      render: (_: unknown, record: Role) => (
        <Space>
          <Can permissions={["admin.rbac.manage"]}>
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => {
                setCloneRole(record);
                form.resetFields();
              }}
            >
              Clone
            </Button>
          </Can>
          <Can permissions={["admin.rbac.read"]}>
            <Link to={`/system/rbac/roles/${record.id}`}>
              <Button icon={<EditOutlined />} size="small">
                Sửa
              </Button>
            </Link>
          </Can>
        </Space>
      ),
    },
  ];

  const handleClone = (values: { code: string; name: string }) => {
    clone.mutate(values, {
      onSuccess: () => {
        message.success("Đã clone vai trò");
        setCloneRole(null);
      },
    });
  };

  return (
    <div>
      <Typography.Title level={3}>Quản lý vai trò</Typography.Title>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Tìm vai trò"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            allowClear
          />
          <Can permissions={["admin.rbac.manage"]}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/system/rbac/roles/new")}
            >
              Tạo vai trò
            </Button>
          </Can>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            onChange: setPage,
          }}
        />
      </Card>

      <Modal
        title={`Clone vai trò "${cloneRole?.name}"`}
        open={cloneRole !== null}
        onCancel={() => setCloneRole(null)}
        onOk={() => form.submit()}
        confirmLoading={clone.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleClone}>
          <Form.Item
            label="Mã vai trò mới (code)"
            name="code"
            rules={[
              { required: true, message: "Vui lòng nhập mã vai trò" },
              {
                pattern: /^[A-Z][A-Z0-9_]*$/,
                message: "Mã viết hoa, chỉ gồm A-Z, 0-9 và _ (vd MODERATOR_FORUM)",
              },
            ]}
          >
            <Input autoFocus placeholder="VD: MODERATOR_FORUM_V2" />
          </Form.Item>
          <Form.Item
            label="Tên vai trò mới"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
