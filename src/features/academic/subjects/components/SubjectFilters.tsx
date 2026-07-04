import { Input, Select, Space } from "antd";
import type { SubjectFilterFormValues, SubjectStatus } from "../../types";

interface SubjectFiltersProps {
  values: SubjectFilterFormValues;
  onChange: (values: SubjectFilterFormValues) => void;
}

export function SubjectFilters({ values, onChange }: SubjectFiltersProps) {
  return (
    <Space wrap>
      <Input.Search
        placeholder="Tìm mã / tên môn"
        allowClear
        value={values.search}
        onChange={(e) => onChange({ ...values, search: e.target.value })}
        onSearch={(value) => onChange({ ...values, search: value })}
        style={{ width: 240 }}
      />
      <Select
        placeholder="Trạng thái"
        allowClear
        value={values.status}
        onChange={(value) => onChange({ ...values, status: value as SubjectStatus })}
        options={[
          { value: "active", label: "Đang hoạt động" },
          { value: "inactive", label: "Ngừng hoạt động" },
          { value: "draft", label: "Bản nháp" },
        ]}
        style={{ width: 160 }}
      />
      <Input.Search
        placeholder="Lecturer ID"
        allowClear
        value={values.lecturerId}
        onChange={(e) => onChange({ ...values, lecturerId: e.target.value })}
        onSearch={(value) => onChange({ ...values, lecturerId: value })}
        style={{ width: 180 }}
      />
    </Space>
  );
}
