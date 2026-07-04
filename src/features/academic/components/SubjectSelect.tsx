import { Select } from "antd";
import { useSubjects } from "../subjects/api/subjects.api";

interface SubjectSelectProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function SubjectSelect({
  value,
  onChange,
  placeholder = "Chọn môn học",
  allowClear = true,
  disabled,
  style,
}: SubjectSelectProps) {
  const { data, isLoading } = useSubjects({ page: 1, pageSize: 1000 });
  return (
    <Select
      loading={isLoading}
      disabled={disabled}
      allowClear={allowClear}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ minWidth: 200, ...style }}
      options={(data?.items ?? []).map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
    />
  );
}
