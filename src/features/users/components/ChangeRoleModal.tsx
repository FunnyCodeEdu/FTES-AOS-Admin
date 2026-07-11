import { useMemo, useState } from "react";
import { Alert, Form, Input, Modal, Select, Space, Tag, Typography, message } from "antd";
import { ApiError } from "../../../shared/api/client";
import { useRoles } from "../../rbac/api";
import { useUpdateUserRoles, useRefreshMeOnForbidden } from "../api/users.api";
import type { UserProfile } from "../types";

interface ChangeRoleModalProps {
  user: UserProfile;
  open: boolean;
  onClose: () => void;
}

export function ChangeRoleModal({ user, open, onClose }: ChangeRoleModalProps) {
  const [form] = Form.useForm<{ roleIds: string[]; reason: string }>();
  const [confirming, setConfirming] = useState(false);
  const [pendingValues, setPendingValues] = useState<{ roleIds: string[]; reason: string } | null>(null);
  const { data: rolesData, isLoading: rolesLoading, isError: rolesError } = useRoles("", 1, 100);
  const updateRoles = useUpdateUserRoles(user.id);
  const refreshMe = useRefreshMeOnForbidden();

  const roleOptions = useMemo(
    () => rolesData?.items.map((r) => ({ label: r.name, value: r.id })) ?? [],
    [rolesData]
  );
  const currentRoleIds = useMemo(() => user.roles.map((r) => r.roleId), [user.roles]);

  const handleSubmit = () => {
    if (!confirming) {
      form.validateFields().then((values) => {
        setPendingValues(values);
        setConfirming(true);
      });
    } else if (pendingValues) {
      const codeById = new Map((rolesData?.items ?? []).map((r) => [r.id, r.code]));
      const selected = pendingValues.roleIds;
      const toCodes = (ids: string[]) =>
        ids.map((id) => codeById.get(id)).filter((c): c is string => !!c);
      const addCodes = toCodes(selected.filter((id) => !currentRoleIds.includes(id)));
      const removeCodes = toCodes(currentRoleIds.filter((id) => !selected.includes(id)));
      updateRoles.mutate({ addCodes, removeCodes, reason: pendingValues.reason }, {
        onSuccess: () => {
          message.success("Đã cập nhật vai trò");
          setConfirming(false);
          setPendingValues(null);
          form.resetFields();
          onClose();
        },
        onError: (err: Error) => {
          const code = err instanceof ApiError ? err.code : undefined;
          if (code === 403) {
            message.error("Bạn không còn quyền thực hiện thao tác này");
            refreshMe();
          } else {
            message.error(err.message || "Thao tác thất bại");
          }
        },
      });
    }
  };

  const selectedRoleIds: string[] = Form.useWatch("roleIds", form) ?? [];
  const added = selectedRoleIds.filter((id) => !currentRoleIds.includes(id));
  const removed = currentRoleIds.filter((id) => !selectedRoleIds.includes(id));

  return (
    <Modal
      title="Đổi vai trò"
      open={open}
      onCancel={() => {
        setConfirming(false);
        setPendingValues(null);
        onClose();
      }}
      onOk={handleSubmit}
      confirmLoading={updateRoles.isPending}
      okText={confirming ? "Xác nhận" : "Tiếp theo"}

    >
      {rolesError && <Alert type="error" message="Không thể tải danh sách vai trò" />}
      {!confirming ? (
        <Form form={form} layout="vertical" initialValues={{ roleIds: currentRoleIds }}>
          <Form.Item
            label="Vai trò"
            name="roleIds"
            rules={[{ required: true, message: "Vui lòng chọn ít nhất một vai trò" }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn vai trò"
              options={roleOptions}
              loading={rolesLoading}
              disabled={rolesLoading || rolesError}
            />
          </Form.Item>
          <Form.Item
            label="Lý do"
            name="reason"
            rules={[{ required: true, message: "Vui lòng nhập lý do" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          {added.length > 0 && (
            <Typography.Paragraph>
              Thêm: <Space wrap>{added.map((id) => <Tag key={id} color="green">{roleOptions.find((o) => o.value === id)?.label || id}</Tag>)}</Space>
            </Typography.Paragraph>
          )}
          {removed.length > 0 && (
            <Typography.Paragraph>
              Bỏ: <Space wrap>{removed.map((id) => <Tag key={id} color="red">{roleOptions.find((o) => o.value === id)?.label || id}</Tag>)}</Space>
            </Typography.Paragraph>
          )}
        </Form>
      ) : (
        <>
          <Typography.Paragraph type="warning">
            Quyền của user sẽ thay đổi ngay lập tức sau khi xác nhận.
          </Typography.Paragraph>
          <Typography.Paragraph>
            Thêm {added.length} vai trò, bỏ {removed.length} vai trò.
          </Typography.Paragraph>
        </>
      )}
    </Modal>
  );
}
