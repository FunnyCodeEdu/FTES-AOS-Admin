import { useEffect, useState } from "react";
import { Descriptions, Modal, Switch, Tag, message } from "antd";
import { Can } from "../../../shared/permissions";
import { useUpdateFlag, type FlagItem } from "../api/flags.api";

interface FlagEditModalProps {
  open: boolean;
  flag?: FlagItem | null;
  onClose: () => void;
}

// Nối BE thật: PUT /api/v1/admin/feature-flags/{key} (AdminPlatformController,
// perm admin.feature-flag.manage). Toggle enabled + bấm Lưu để xác nhận.
export function FlagEditModal({ open, flag, onClose }: FlagEditModalProps) {
  const updateFlag = useUpdateFlag();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (open) setEnabled(flag?.enabled ?? false);
  }, [open, flag]);

  const dirty = !!flag && enabled !== flag.enabled;

  function handleSave() {
    if (!flag) return;
    updateFlag.mutate(
      { key: flag.key, enabled },
      {
        onSuccess: () => {
          message.success(`Đã ${enabled ? "bật" : "tắt"} flag ${flag.key}`);
          onClose();
        },
      }
    );
  }

  return (
    <Modal
      open={open}
      title={`Feature flag: ${flag?.key ?? ""}`}
      onCancel={onClose}
      okText="Lưu"
      cancelText="Đóng"
      okButtonProps={{ disabled: !dirty }}
      confirmLoading={updateFlag.isPending}
      onOk={handleSave}
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Key">{flag?.key ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Mô tả">{flag?.description ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <Can
            permissions={["admin.feature-flag.manage"]}
            fallback={
              flag?.enabled ? <Tag color="green">Đang bật</Tag> : <Tag>Đang tắt</Tag>
            }
          >
            <Switch
              checked={enabled}
              onChange={setEnabled}
              checkedChildren="Bật"
              unCheckedChildren="Tắt"
            />
          </Can>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
