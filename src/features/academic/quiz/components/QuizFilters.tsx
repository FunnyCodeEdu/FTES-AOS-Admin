import { Input, Select } from "antd";
import { SubjectSelect } from "../../components/SubjectSelect";
import type { QuizDifficulty, QuizFilterFormValues, QuizStatus } from "../../types";

interface QuizFiltersProps {
  values: QuizFilterFormValues;
  onChange: (values: QuizFilterFormValues) => void;
}

export function QuizFilters({ values, onChange }: QuizFiltersProps) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <SubjectSelect
        value={values.subjectId}
        onChange={(value) => onChange({ ...values, subjectId: value })}
        placeholder="Môn học"
      />
      <Select
        placeholder="Độ khó"
        allowClear
        value={values.difficulty}
        onChange={(value) => onChange({ ...values, difficulty: value as QuizDifficulty })}
        style={{ width: 140 }}
        options={[
          { value: "easy", label: "Dễ" },
          { value: "medium", label: "Trung bình" },
          { value: "hard", label: "Khó" },
        ]}
      />
      <Select
        placeholder="Trạng thái"
        allowClear
        value={values.status}
        onChange={(value) => onChange({ ...values, status: value as QuizStatus })}
        style={{ width: 160 }}
        options={[
          { value: "draft", label: "Nháp" },
          { value: "ready", label: "Sẵn sàng" },
          { value: "archived", label: "Lưu trữ" },
        ]}
      />
      <Input.Search
        placeholder="Tìm nội dung câu hỏi"
        allowClear
        value={values.search}
        onChange={(e) => onChange({ ...values, search: e.target.value })}
        onSearch={(value) => onChange({ ...values, search: value })}
        style={{ width: 260 }}
      />
    </div>
  );
}
