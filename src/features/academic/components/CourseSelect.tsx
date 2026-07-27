import { Select } from "antd";
import { useCourses } from "../courses/api/courses.api";

interface CourseSelectProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
}

/**
 * Picker khoá học tìm-kiếm-được (khuôn `SubjectSelect`). Tải tối đa 1000 khoá qua GraphQL
 * `adminCourses` — đủ cho quy mô hiện tại; cùng queryKey với các nơi dùng `useCourses` pageSize 1000
 * nên TanStack dedupe, không gọi trùng mạng.
 */
export function CourseSelect({
  value,
  onChange,
  placeholder = "Chọn khoá học",
  allowClear = true,
  disabled,
  loading,
  style,
}: CourseSelectProps) {
  const { data, isLoading } = useCourses({ page: 1, pageSize: 1000 });
  return (
    <Select
      loading={isLoading || loading}
      disabled={disabled}
      allowClear={allowClear}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ minWidth: 260, ...style }}
      options={(data?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
      showSearch
      optionFilterProp="label"
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
    />
  );
}
