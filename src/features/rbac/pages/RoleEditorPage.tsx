import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { PermissionTree } from "../components/PermissionTree";
import {
  useCreateRole,
  usePermissionCatalog,
  useRole,
  useUpdateRole,
} from "../api";
import { Can } from "../../../shared/permissions";
import { queryClient } from "../../../shared/api/queryClient";

function diffArrays(prev: string[], next: string[]) {
  const added = next.filter((x) => !prev.includes(x));
  const removed = prev.filter((x) => !next.includes(x));
  return { added, removed };
}

function RoleDiff({
  open,
  onCancel,
  onConfirm,
  roleName,
  prevPermissions,
  nextPermissions,
  affectedUserCount,
  isLoading,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  roleName: string;
  prevPermissions: string[];
  nextPermissions: string[];
  affectedUserCount: number;
  isLoading: boolean;
}) {
  const { added, removed } = useMemo(
    () => diffArrays(prevPermissions, nextPermissions),
    [prevPermissions, nextPermissions]
  );

  return (
    <Modal
      title={`Xác nhận thay đổi quyền của "${roleName}"`}
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      confirmLoading={isLoading}
      okText="Xác nhận lưu"
      cancelText="Huỷ"
    >
      {affectedUserCount > 0 && (
        <Typography.Paragraph type="warning">
          Thay đổi này ảnh hưởng ngay tới {affectedUserCount} user đang giữ vai trò này.
        </Typography.Paragraph>
      )}

      <Typography.Paragraph strong>Thêm quyền ({added.length})</Typography.Paragraph>
      <Space wrap style={{ marginBottom: 16 }}>
        {added.map((p) => (
          <Tag key={p} color="green">
            {p}
          </Tag>
        ))}
        {added.length === 0 && <Typography.Text type="secondary">Không có</Typography.Text>}
      </Space>

      <Typography.Paragraph strong>Bỏ quyền ({removed.length})</Typography.Paragraph>
      <Space wrap>
        {removed.map((p) => (
          <Tag key={p} color="red">
            {p}
          </Tag>
        ))}
        {removed.length === 0 && <Typography.Text type="secondary">Không có</Typography.Text>}
      </Space>
    </Modal>
  );
}

export default function RoleEditorPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const isNew = roleId === "new" || !roleId;
  const { data: role, isLoading: roleLoading } = useRole(isNew ? undefined : roleId);
  const { data: catalog, isLoading: catalogLoading } = usePermissionCatalog();
  const create = useCreateRole();
  const update = useUpdateRole(roleId ?? "");

  const [form] = Form.useForm<{ name: string; description: string; permissions: string[] }>();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    if (role) {
      form.setFieldsValue({
        name: role.name,
        description: role.description ?? "",
        permissions: role.permissions ?? [],
      });
      setSelectedPermissions(role.permissions ?? []);
    } else if (isNew) {
      form.resetFields();
      setSelectedPermissions([]);
    }
  }, [role, form, isNew]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.isFieldsTouched()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form]);

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        if (selectedPermissions.length === 0) {
          message.error("Vui lòng chọn ít nhất một quyền");
          return;
        }
        if (!isNew && role) {
          const prev = role.permissions ?? [];
          const hasChange =
            prev.length !== selectedPermissions.length ||
            prev.some((p) => !selectedPermissions.includes(p));
          if (hasChange) {
            setShowDiff(true);
            return;
          }
        }
        submit(values.name, values.description ?? "", selectedPermissions);
      })
      .catch(() => {});
  };

  const submit = (name: string, description: string, permissions: string[]) => {
    const payload = { name, description, permissions };
    if (isNew) {
      create.mutate(payload, {
        onSuccess: () => {
          message.success("Đã tạo vai trò");
          navigate("/system/rbac/roles");
        },
      });
    } else {
      update.mutate(payload, {
        onSuccess: () => {
          message.success("Đã cập nhật vai trò");
          queryClient.invalidateQueries({ queryKey: ["rbac", "role", roleId] });
          navigate("/system/rbac/roles");
        },
      });
    }
  };

  const isLoading = roleLoading || catalogLoading;
  const affectedUserCount = role?.userCount ?? 0;

  return (
    <div>
      <Typography.Title level={3}>
        {isNew ? "Tạo vai trò" : `Sửa vai trò: ${role?.name ?? ""}`}
      </Typography.Title>

      {affectedUserCount > 0 && !isNew && (
        <Typography.Paragraph type="warning" style={{ marginBottom: 16 }}>
          Vai trò này đang được {affectedUserCount} user sử dụng. Thay đổi quyền sẽ ảnh hưởng ngay
          tới họ.
        </Typography.Paragraph>
      )}

      <Card loading={isLoading}>
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên vai trò"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Quyền" name="permissions">
            <PermissionTree
              catalog={catalog}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
          </Form.Item>
        </Form>

        <Space style={{ marginTop: 24 }}>
          <Can permissions={["admin.rbac.manage"]}>
            <Button
              type="primary"
              onClick={handleSave}
              loading={create.isPending || update.isPending}
            >
              Lưu
            </Button>
          </Can>
          <Button onClick={() => navigate("/system/rbac/roles")}>Huỷ</Button>
        </Space>
      </Card>

      {!isNew && role && (
        <RoleDiff
          open={showDiff}
          onCancel={() => setShowDiff(false)}
          onConfirm={() => {
            const values = form.getFieldsValue();
            submit(values.name, values.description ?? "", selectedPermissions);
            setShowDiff(false);
          }}
          roleName={role.name}
          prevPermissions={role.permissions ?? []}
          nextPermissions={selectedPermissions}
          affectedUserCount={affectedUserCount}
          isLoading={update.isPending}
        />
      )}
    </div>
  );
}
