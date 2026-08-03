import { Select } from "antd";
import { useCourses } from "../courses/api/courses.api";

interface CourseSelectProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  /** Ẩn các khoá đã chọn/đã gắn khỏi options (vd khoá đã có trong kỳ). */
  excludeIds?: string[];
}

/**
 * Picker khoá học — mirror `SubjectSelect`. Nguồn `useCourses` (GraphQL `adminCourses`, đã có),
 * lấy 1 trang lớn rồi tìm client-side. `excludeIds` để loại khoá đã gắn (chống trùng ở FE).
 */
export function CourseSelect({
  value,
  onChange,
  placeholder = "Chọn khoá học",
  allowClear = true,
  disabled,
  style,
  excludeIds = [],
}: CourseSelectProps) {
  const { data, isLoading } = useCourses({ page: 1, pageSize: 1000 });
  const exclude = new Set(excludeIds);
  return (
    <Select
      loading={isLoading}
      disabled={disabled}
      allowClear={allowClear}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ minWidth: 240, ...style }}
      options={(data?.items ?? [])
        .filter((c) => !exclude.has(c.id))
        .map((c) => ({ value: c.id, label: c.name }))}
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
    />
  );
}
