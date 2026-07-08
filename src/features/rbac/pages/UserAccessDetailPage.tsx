import { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  useAssignRole,
  useCreateGrant,
  usePermissionCatalog,
  useRevokeGrant,
  useRevokeRole,
  useRoles,
  useScopes,
  useUserAccess,
  useUserAudit,
} from "../api";
import { Can } from "../../../shared/permissions";
import type { UserRoleAssignment, UserScopedGrant } from "../types";

function formatDate(iso: string) {
  return dayjs(iso).format("DD/MM/YYYY HH:mm");
}

function isExpiringSoon(expiresAt: string) {
  return dayjs(expiresAt).diff(dayjs(), "day") < 7 && dayjs(expiresAt).isAfter(dayjs());
}

function isExpired(expiresAt: string) {
  return dayjs(expiresAt).isBefore(dayjs());
}

const DANGEROUS_PERMISSIONS = ["user.lock", "role.manage", "grant.manage", "system.config"];

export function AssignRoleModal({
  userId,
  open,
  onClose,
  currentRoleIds,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
  currentRoleIds: string[];
}) {
  const [activeTab, setActiveTab] = useState("roles");
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [confirmedRoleId, setConfirmedRoleId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const { data: roles } = useRoles("", 1, 100);
  const assign = useAssignRole(userId);

  const allRoles = roles?.items ?? [];

  const roleItems = allRoles.filter((r) => !r.isPreset);
  const presetItems = allRoles.filter((r) => r.isPreset);

  const selectedRoleId = Form.useWatch("roleId", form);
  const effectiveRoleId = step === "confirm" ? confirmedRoleId : selectedRoleId;
  const selectedRole = allRoles.find((r) => r.id === effectiveRoleId);
  const selectedPermissions = selectedRole?.permissions ?? [];
  const dangerous = selectedPermissions.filter((p) => DANGEROUS_PERMISSIONS.includes(p));

  const resetAndClose = () => {
    form.resetFields();
    setStep("select");
    setConfirmedRoleId(null);
    onClose();
  };

  const handleSelectNext = () => {
    form.validateFields().then((values) => {
      setConfirmedRoleId(values.roleId);
      setStep("confirm");
    });
  };

  const handleConfirm = () => {
    if (!confirmedRoleId) return;
    assign.mutate({ roleId: confirmedRoleId }, {
      onSuccess: () => {
        message.success("Đã gán vai trò");
        resetAndClose();
      },
    });
  };

  return (
    <Modal
      title={step === "select" ? "Gán vai trò" : `Xác nhận gán "${selectedRole?.name ?? ""}"`}
      open={open}
      onCancel={resetAndClose}
      onOk={step === "select" ? handleSelectNext : handleConfirm}
      confirmLoading={assign.isPending}
      okText={step === "select" ? "Tiếp theo" : "Xác nhận gán"}
      cancelText={step === "select" ? "Huỷ" : "Quay lại"}
      cancelButtonProps={{
        onClick: step === "confirm" ? () => { setStep("select"); setConfirmedRoleId(null); } : undefined,
      }}
    >
      {step === "select" ? (
        <Form form={form} layout="vertical">
          <Tabs activeKey={activeTab} onChange={setActiveTab} destroyInactiveTabPane>
            <Tabs.TabPane tab="Vai trò" key="roles">
              <Form.Item
                label="Chọn vai trò"
                name="roleId"
                rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
              >
                <Radio.Group style={{ width: "100%" }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {roleItems.length === 0 && (
                      <Typography.Text type="secondary">Không có vai trò nào</Typography.Text>
                    )}
                    {roleItems.map((r) => (
                      <Radio key={r.id} value={r.id} disabled={currentRoleIds.includes(r.id)}>
                        {r.name}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Tabs.TabPane>
            <Tabs.TabPane tab="Preset admin mảng" key="presets">
              <Form.Item
                label="Chọn preset"
                name="roleId"
                rules={[{ required: true, message: "Vui lòng chọn preset" }]}
              >
                <Radio.Group style={{ width: "100%" }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {presetItems.length === 0 && (
                      <Typography.Text type="secondary">Không có preset nào</Typography.Text>
                    )}
                    {presetItems.map((r) => {
                      const disabled = currentRoleIds.includes(r.id);
                      const label = disabled ? (
                        <Tooltip title="User đã có preset này">
                          <span>{`${r.name} (${r.presetDomain}) — đã có`}</span>
                        </Tooltip>
                      ) : (
                        `${r.name} (${r.presetDomain})`
                      );
                      return (
                        <Radio key={r.id} value={r.id} disabled={disabled}>
                          {label}
                        </Radio>
                      );
                    })}
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Tabs.TabPane>
          </Tabs>
        </Form>
      ) : (
        <>
          <Typography.Paragraph>
            User sẽ nhận <strong>{selectedPermissions.length}</strong> quyền từ vai trò{" "}
            <strong>{selectedRole?.name}</strong>:
          </Typography.Paragraph>
          {activeTab === "presets" && dangerous.length > 0 && (
            <Typography.Paragraph type="danger">
              Cảnh báo: preset chứa {dangerous.length} quyền nguy hiểm —{" "}
              {dangerous.join(", ")}.
            </Typography.Paragraph>
          )}
          <Space wrap style={{ marginBottom: 16 }}>
            {selectedPermissions.map((p) => (
              <Tag key={p} color={DANGEROUS_PERMISSIONS.includes(p) ? "red" : undefined}>
                {p}
              </Tag>
            ))}
            {selectedPermissions.length === 0 && (
              <Typography.Text type="secondary">Không có quyền nào</Typography.Text>
            )}
          </Space>
        </>
      )}
    </Modal>
  );
}

function ScopedGrantModal({
  userId,
  open,
  onClose,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const [scopeType, setScopeType] = useState<string>();
  const [scopeSearch, setScopeSearch] = useState("");
  const { data: catalog } = usePermissionCatalog();
  const { data: scopes } = useScopes(scopeType, scopeSearch);
  const create = useCreateGrant(userId);

  const scopablePermissions = useMemo(
    () =>
      catalog?.domains.flatMap((d) => d.permissions.filter((p) => p.scopable).map((p) => p.key)) ??
      [],
    [catalog]
  );

  const handleSubmit = (values: {
    permission: string;
    scopeType: string;
    scopeId: string;
    expiresAt: dayjs.Dayjs;
    reason: string;
  }) => {
    create.mutate(
      {
        permission: values.permission,
        scopeType: values.scopeType as "GROUP" | "SUBJECT" | "RESOURCE_SET",
        scopeId: values.scopeId,
        expiresAt: values.expiresAt.toISOString(),
        reason: values.reason,
      },
      {
        onSuccess: () => {
          message.success("Đã cấp grant");
          onClose();
          form.resetFields();
        },
      }
    );
  };

  return (
    <Modal
      title="Cấp scoped grant"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={create.isPending}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Permission"
          name="permission"
          rules={[{ required: true, message: "Vui lòng chọn permission" }]}
        >
          <Select options={scopablePermissions.map((p) => ({ label: p, value: p }))} />
        </Form.Item>
        <Form.Item
          label="Scope type"
          name="scopeType"
          rules={[{ required: true, message: "Vui lòng chọn loại scope" }]}
        >
          <Select
            options={[
              { label: "GROUP", value: "GROUP" },
              { label: "SUBJECT", value: "SUBJECT" },
              { label: "RESOURCE_SET", value: "RESOURCE_SET" },
            ]}
            onChange={(v) => {
              setScopeType(v);
              form.setFieldValue("scopeId", undefined);
            }}
          />
        </Form.Item>
        <Form.Item
          label="Scope"
          name="scopeId"
          rules={[{ required: true, message: "Vui lòng chọn scope" }]}
        >
          <Select
            showSearch
            onSearch={setScopeSearch}
            options={scopes?.items.map((s) => ({ label: s.name, value: s.scopeId }))}
          />
        </Form.Item>
        <Form.Item
          label="Hết hạn"
          name="expiresAt"
          rules={[{ required: true, message: "Vui lòng chọn ngày hết hạn" }]}
        >
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="Lý do"
          name="reason"
          rules={[{ required: true, message: "Vui lòng nhập lý do" }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function UserAccessDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: access, isLoading } = useUserAccess(userId);
  const { data: audit } = useUserAudit(userId, 1, 10);
  const revokeRole = useRevokeRole(userId ?? "");
  const revokeGrant = useRevokeGrant(userId ?? "");
  const [assignOpen, setAssignOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState<{
    type: "role" | "grant";
    id: string;
    name: string;
  } | null>(null);
  const [reasonForm] = Form.useForm();

  const currentRoleIds = useMemo(
    () => access?.roles.map((r) => r.roleId) ?? [],
    [access]
  );

  const roleColumns = [
    { title: "Vai trò", dataIndex: "name" },
    { title: "Gán bởi", dataIndex: "assignedBy" },
    {
      title: "Gán lúc",
      dataIndex: "assignedAt",
      render: (v: string) => formatDate(v),
    },
    {
      title: "Thao tác",
      render: (_: unknown, record: UserRoleAssignment) => (
        <Can permissions={["admin.rbac.grant"]}>
          <Button
            danger
            icon={<MinusCircleOutlined />}
            size="small"
            onClick={() =>
              setRevokeReason({ type: "role", id: record.roleId, name: record.name })
            }
          >
            Tước
          </Button>
        </Can>
      ),
    },
  ];

  const grantColumns = [
    { title: "Permission", dataIndex: "permission" },
    { title: "Scope", render: (_: unknown, r: UserScopedGrant) => `${r.scopeType}: ${r.scopeName}` },
    {
      title: "Hết hạn",
      dataIndex: "expiresAt",
      render: (v: string) => (
        <Tag color={isExpired(v) ? "default" : isExpiringSoon(v) ? "orange" : "green"}>
          {formatDate(v)}
        </Tag>
      ),
    },
    { title: "Lý do", dataIndex: "reason" },
    { title: "Cấp bởi", dataIndex: "grantedBy" },
    {
      title: "Thao tác",
      render: (_: unknown, record: UserScopedGrant) => (
        <Can permissions={["admin.rbac.grant"]}>
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            disabled={isExpired(record.expiresAt)}
            onClick={() =>
              setRevokeReason({
                type: "grant",
                id: record.grantId,
                name: `${record.permission} trên ${record.scopeType}`,
              })
            }
          >
            Thu hồi
          </Button>
        </Can>
      ),
    },
  ];

  const auditColumns = [
    { title: "Hành động", dataIndex: "action" },
    { title: "Người thực hiện", dataIndex: "actor" },
    { title: "Thời gian", dataIndex: "timestamp", render: (v: string) => formatDate(v) },
    { title: "Lý do", dataIndex: "reason" },
  ];

  const handleRevoke = (values: { reason: string }) => {
    if (!revokeReason) return;
    if (revokeReason.type === "role") {
      revokeRole.mutate(
        { roleId: revokeReason.id, reason: values.reason },
        {
          onSuccess: () => {
            message.success("Đã tước vai trò");
            setRevokeReason(null);
            reasonForm.resetFields();
          },
        }
      );
    } else {
      revokeGrant.mutate(
        { grantId: revokeReason.id, reason: values.reason },
        {
          onSuccess: () => {
            message.success("Đã thu hồi grant");
            setRevokeReason(null);
            reasonForm.resetFields();
          },
        }
      );
    }
  };

  return (
    <div>
      <Typography.Title level={3}>Chi tiết quyền user</Typography.Title>
      <Card loading={isLoading}>
        <Typography.Paragraph>
          <strong>{access?.user.fullName}</strong> ({access?.user.email})
        </Typography.Paragraph>

        <Tabs>
          <Tabs.TabPane tab="Vai trò" key="roles">
            <Can permissions={["admin.rbac.grant"]}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAssignOpen(true)}
                style={{ marginBottom: 16 }}
              >
                Gán vai trò
              </Button>
            </Can>
            <Table
              rowKey="roleId"
              columns={roleColumns}
              dataSource={access?.roles ?? []}
              pagination={false}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Scoped grants" key="grants">
            <Can permissions={["admin.rbac.grant"]}>
              <Button
                type="primary"
                icon={<SafetyCertificateOutlined />}
                onClick={() => setGrantOpen(true)}
                style={{ marginBottom: 16 }}
              >
                Cấp grant
              </Button>
            </Can>
            <Table
              rowKey="grantId"
              columns={grantColumns}
              dataSource={access?.grants ?? []}
              pagination={false}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Lịch sử" key="audit">
            <Table
              rowKey="id"
              columns={auditColumns}
              dataSource={audit?.items ?? []}
              pagination={false}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {userId && (
        <>
          <AssignRoleModal
            userId={userId}
            open={assignOpen}
            onClose={() => setAssignOpen(false)}
            currentRoleIds={currentRoleIds}
          />
          <ScopedGrantModal userId={userId} open={grantOpen} onClose={() => setGrantOpen(false)} />
        </>
      )}

      <Modal
        title={`Xác nhận ${revokeReason?.type === "role" ? "tước vai trò" : "thu hồi grant"}`}
        open={revokeReason !== null}
        onCancel={() => setRevokeReason(null)}
        onOk={() => reasonForm.submit()}
        confirmLoading={revokeRole.isPending || revokeGrant.isPending}
      >
        <Typography.Paragraph>
          Bạn sắp {revokeReason?.type === "role" ? "tước" : "thu hồi"}{" "}
          <strong>{revokeReason?.name}</strong>.
        </Typography.Paragraph>
        <Form form={reasonForm} layout="vertical" onFinish={handleRevoke}>
          <Form.Item
            label="Lý do"
            name="reason"
            rules={[{ required: true, message: "Vui lòng nhập lý do" }]}
          >
            <Input.TextArea rows={3} autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
