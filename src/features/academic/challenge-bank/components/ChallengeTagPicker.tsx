import { useEffect, useMemo, useState } from "react";
import { Select } from "antd";
import { useChallengeTagVocabulary } from "../api/challengeBankConsole.api";

interface ChallengeTagPickerProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  /** BE chặn ở 32 tag; mặc định theo đúng trần đó. */
  maxCount?: number;
}

/**
 * Chọn tag challenge: gợi ý từ từ vựng có sẵn (`GET /admin/challenges/tags`, debounce 300ms) NHƯNG
 * vẫn cho gõ tag mới — `mode="tags"` chứ không phải `mode="multiple"`.
 *
 * Vì sao phải cho gõ mới: mô hình đề PE phân loại bằng `PE` + MÃ MÔN; môn mới toanh chưa có tag nào
 * trong từ vựng, mà `mode="multiple"` thì không có cách nào tạo tag đầu tiên (BE tự tạo slug khi
 * nhận tag lạ ở `PUT /{id}/tags`).
 *
 * Giá trị là mảng CHUỖI THÔ người dùng nhìn thấy (slug hoặc nhãn tự gõ) — BE chuẩn hoá + khử trùng.
 * Component này là controlled thuần, KHÔNG tự gọi mutation nào.
 */
export function ChallengeTagPicker({
  value,
  onChange,
  placeholder = "Tag (vd PE, MAE101)",
  disabled,
  style,
  maxCount = 32,
}: ChallengeTagPickerProps) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data: vocab, isFetching } = useChallengeTagVocabulary(search);

  // Tag ĐANG CHỌN phải luôn nằm trong options, kể cả khi từ vựng trả về không chứa nó (người dùng
  // vừa gõ tag mới, hoặc đang lọc bằng `q` khác) — thiếu thì AntD hiện đúng chuỗi thô nhưng mất nhãn.
  const options = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of vocab ?? []) {
      map.set(tag.slug, tag.label ? `${tag.label} (${tag.slug})` : tag.slug);
    }
    for (const selected of value ?? []) {
      if (!map.has(selected)) map.set(selected, selected);
    }
    return Array.from(map, ([slug, label]) => ({ value: slug, label }));
  }, [vocab, value]);

  return (
    <Select
      mode="tags"
      allowClear
      disabled={disabled}
      value={value}
      onChange={onChange}
      onSearch={setInput}
      // Lọc là việc của server (`q`); lọc lại client-side sẽ giấu mất kết quả server vừa trả về
      // chỉ vì nhãn không chứa nguyên văn chuỗi gõ.
      filterOption={false}
      loading={isFetching}
      options={options}
      maxCount={maxCount}
      placeholder={placeholder}
      style={{ minWidth: 220, ...style }}
      tokenSeparators={[","]}
    />
  );
}
