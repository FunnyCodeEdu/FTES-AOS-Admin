import { useState } from "react";
import { Form, InputNumber, Modal, Radio, Space, Typography } from "antd";

type Criteria = "attended" | "all";

interface EventCertificateModalProps {
  open: boolean;
  eventTitle: string;
  estimatedCount: number;
  criteria: Criteria;
  onCriteriaChange: (criteria: Criteria) => void;
  onClose: () => void;
  onConfirm: (criteria: Criteria, rewardPoints?: number) => void;
  confirmLoading?: boolean;
}

export function EventCertificateModal({
  open,
  eventTitle,
  estimatedCount,
  criteria,
  onCriteriaChange,
  onClose,
  onConfirm,
  confirmLoading,
}: EventCertificateModalProps) {
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);

  return (
    <Modal
      open={open}
      title="Cấp certificate & reward"
      onCancel={onClose}
      onOk={() => onConfirm(criteria, rewardPoints ?? undefined)}
      confirmLoading={confirmLoading}
      okText="Cấp"
      cancelText="Huỷ"
      okButtonProps={{ disabled: estimatedCount === 0 }}
      afterClose={() => { setRewardPoints(null); }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Text>
          Event: <strong>{eventTitle}</strong>
        </Typography.Text>
        <Typography.Text>
          Số lượng dự kiến: <strong>{estimatedCount}</strong>
        </Typography.Text>
        <Form.Item label="Tiêu chí cấp">
          <Radio.Group value={criteria} onChange={(e) => onCriteriaChange(e.target.value)}>
            <Radio value="attended">Chỉ user đã check-in</Radio>
            <Radio value="all">Tất cả registrants</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Điểm thưởng (tùy chọn)">
          <InputNumber min={0} value={rewardPoints} onChange={setRewardPoints} style={{ width: "100%" }} placeholder="Không cấp điểm" />
        </Form.Item>
      </Space>
    </Modal>
  );
}
