import { Form, Select, Space } from "antd";
import type { BroadcastSegment } from "../shared/types";

interface SegmentBuilderProps {
  value: BroadcastSegment;
  onChange: (value: BroadcastSegment) => void;
}

const ROLE_OPTIONS = [
  { label: "Học viên", value: "STUDENT" },
  { label: "Giảng viên", value: "LECTURER" },
  { label: "Cộng tác viên", value: "CTV" },
  { label: "Kiểm duyệt viên", value: "MODERATOR" },
  { label: "Quản trị viên", value: "ADMIN" },
];

export function SegmentBuilder({ value, onChange }: SegmentBuilderProps) {
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Form.Item label="Vai trò">
        <Select
          mode="multiple"
          allowClear
          placeholder="Tất cả vai trò"
          options={ROLE_OPTIONS}
          value={value.roles}
          onChange={(roles) => onChange({ roles })}
          style={{ width: "100%" }}
        />
      </Form.Item>
    </Space>
  );
}
