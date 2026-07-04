import { Input, Select } from "antd";
import { SubjectSelect } from "../../components/SubjectSelect";
import type { ResourceFilterFormValues, ResourceStatus, ResourceType } from "../../types";

interface ResourceFiltersProps {
  values: ResourceFilterFormValues;
  onChange: (values: ResourceFilterFormValues) => void;
  subjectLocked?: boolean;
}

export function ResourceFilters({ values, onChange, subjectLocked }: ResourceFiltersProps) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <SubjectSelect
        value={values.subjectId}
        onChange={(value) => onChange({ ...values, subjectId: value })}
        placeholder="Môn học"
        disabled={subjectLocked}
      />
      <Select
        placeholder="Loại"
        allowClear
        value={values.type}
        onChange={(value) => onChange({ ...values, type: value as ResourceType })}
        style={{ width: 140 }}
        options={[
          { value: "video", label: "Video" },
          { value: "pdf", label: "PDF" },
          { value: "slide", label: "Slide" },
          { value: "quiz", label: "Quiz" },
          { value: "link", label: "Link" },
          { value: "other", label: "Khác" },
        ]}
      />
      <Select
        placeholder="Trạng thái"
        allowClear
        value={values.status}
        onChange={(value) => onChange({ ...values, status: value as ResourceStatus })}
        style={{ width: 160 }}
        options={[
          { value: "pending", label: "Chờ duyệt" },
          { value: "approved", label: "Đã duyệt" },
          { value: "rejected", label: "Từ chối" },
        ]}
      />
      <Input.Search
        placeholder="Tìm theo tên"
        allowClear
        value={values.search}
        onChange={(e) => onChange({ ...values, search: e.target.value })}
        onSearch={(value) => onChange({ ...values, search: value })}
        style={{ width: 240 }}
      />
    </div>
  );
}
