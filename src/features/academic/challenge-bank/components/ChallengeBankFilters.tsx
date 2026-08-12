import { useEffect, useState } from "react";
import { Button, Checkbox, Input, Select, Space } from "antd";
import { ClearOutlined } from "@ant-design/icons";
import { CourseSelect } from "../../components/CourseSelect";
import { SubjectSelect } from "../../components/SubjectSelect";
import {
  CHALLENGE_DIFFICULTY_OPTIONS,
  CHALLENGE_STATUS_OPTIONS,
  CHALLENGE_TYPE_OPTIONS,
  type BankSearchParams,
} from "../types";
import { ChallengeTagPicker } from "./ChallengeTagPicker";

interface ChallengeBankFiltersProps {
  value: BankSearchParams;
  /** Nhận PATCH bộ lọc; trang tự đặt lại `page = 1` khi bộ lọc đổi. */
  onChange: (patch: Partial<BankSearchParams>) => void;
  onReset: () => void;
  hasFilters: boolean;
}

/**
 * Thanh lọc của kho — controlled thuần, KHÔNG tự gọi API danh sách (trang giữ state + query).
 *
 * Ô tìm tiêu đề debounce 300ms tại chỗ: đẩy từng ký tự lên `onChange` sẽ bắn một request mỗi phím.
 * Các select khác đổi là áp ngay (một cú bấm = một ý định rõ ràng).
 */
export function ChallengeBankFilters({
  value,
  onChange,
  onReset,
  hasFilters,
}: ChallengeBankFiltersProps) {
  const [text, setText] = useState(value.q ?? "");

  // Đồng bộ ngược khi trang reset bộ lọc từ bên ngoài (nút "Xoá bộ lọc" / nhảy từ màn khác sang).
  useEffect(() => {
    setText(value.q ?? "");
  }, [value.q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = text.trim();
      if (next !== (value.q ?? "")) onChange({ q: next || undefined });
    }, 300);
    return () => clearTimeout(timer);
    // `value.q`/`onChange` cố tình không nằm trong deps: chỉ ô nhập mới được kích hoạt debounce này.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      <Space wrap>
        <Input.Search
          placeholder="Tìm theo tiêu đề"
          allowClear
          value={text}
          onChange={(e) => setText(e.target.value)}
          onSearch={(v) => onChange({ q: v.trim() || undefined })}
          style={{ width: 260 }}
        />
        <ChallengeTagPicker
          value={value.tags}
          onChange={(tags) => onChange({ tags })}
          placeholder="Lọc theo tag"
          style={{ minWidth: 260 }}
        />
        <Select
          placeholder="Loại bài"
          allowClear
          value={value.type}
          onChange={(type) => onChange({ type })}
          options={CHALLENGE_TYPE_OPTIONS}
          style={{ minWidth: 150 }}
        />
        <Select
          placeholder="Độ khó"
          allowClear
          value={value.difficulty}
          onChange={(difficulty) => onChange({ difficulty })}
          options={CHALLENGE_DIFFICULTY_OPTIONS}
          style={{ minWidth: 140 }}
        />
        <Select
          placeholder="Trạng thái"
          allowClear
          value={value.status}
          onChange={(status) => onChange({ status })}
          options={CHALLENGE_STATUS_OPTIONS}
          style={{ minWidth: 160 }}
        />
      </Space>
      <Space wrap>
        <SubjectSelect
          value={value.subjectId}
          onChange={(subjectId) => onChange({ subjectId })}
          placeholder="Môn học"
        />
        <CourseSelect
          value={value.courseId}
          onChange={(courseId) => onChange({ courseId })}
          placeholder="Khoá học (bắt buộc nếu bạn chỉ quản một khoá)"
        />
        <Checkbox
          checked={Boolean(value.onlyUnattached)}
          onChange={(e) => onChange({ onlyUnattached: e.target.checked })}
        >
          Chỉ bài chưa gắn vào khoá nào
        </Checkbox>
        <Button icon={<ClearOutlined />} disabled={!hasFilters} onClick={onReset}>
          Xoá bộ lọc
        </Button>
      </Space>
    </Space>
  );
}
