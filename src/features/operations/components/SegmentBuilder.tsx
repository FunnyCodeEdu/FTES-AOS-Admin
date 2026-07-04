import { Form, Select, Space } from "antd";
import type { BroadcastSegment } from "../shared/types";

interface SegmentBuilderProps {
  value: BroadcastSegment;
  onChange: (value: BroadcastSegment) => void;
}

const CAMPUS_OPTIONS = [
  { label: "Hà Nội", value: "hn" },
  { label: "TP. Hồ Chí Minh", value: "hcm" },
  { label: "Đà Nẵng", value: "dn" },
];

const SUBJECT_OPTIONS = [
  { label: "Toán", value: "math" },
  { label: "Ngữ văn", value: "literature" },
  { label: "Tiếng Anh", value: "english" },
];

const ROLE_OPTIONS = [
  { label: "Học sinh", value: "student" },
  { label: "Giáo viên", value: "teacher" },
  { label: "Phụ huynh", value: "parent" },
];

export function SegmentBuilder({ value, onChange }: SegmentBuilderProps) {
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Form.Item label="Cơ sở">
        <Select
          mode="multiple"
          allowClear
          placeholder="Tất cả cơ sở"
          options={CAMPUS_OPTIONS}
          value={value.campusIds}
          onChange={(campusIds) => onChange({ ...value, campusIds })}
          style={{ width: "100%" }}
        />
      </Form.Item>
      <Form.Item label="Môn học">
        <Select
          mode="multiple"
          allowClear
          placeholder="Tất cả môn"
          options={SUBJECT_OPTIONS}
          value={value.subjectIds}
          onChange={(subjectIds) => onChange({ ...value, subjectIds })}
          style={{ width: "100%" }}
        />
      </Form.Item>
      <Form.Item label="Vai trò">
        <Select
          mode="multiple"
          allowClear
          placeholder="Tất cả vai trò"
          options={ROLE_OPTIONS}
          value={value.roles}
          onChange={(roles) => onChange({ ...value, roles })}
          style={{ width: "100%" }}
        />
      </Form.Item>
    </Space>
  );
}
