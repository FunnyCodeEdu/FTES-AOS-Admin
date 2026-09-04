import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "antd";

import { useSubjects } from "../subjects/api/subjects.api";

/**
 * Trần cứng của `adminSubjects`: xin bao nhiêu thì xin, server chỉ trả tối đa 100 dòng.
 *
 * Bản trước xin `pageSize: 1000` rồi lọc bằng `filterOption` phía client, tin rằng đã cầm đủ danh
 * mục. Nhưng danh mục có 465 môn, nên 365 môn NGOÀI 100 dòng đầu không bao giờ xuất hiện — gõ
 * "WED201c" ra rỗng và người vận hành không tạo nổi đề cho môn đó, mà màn hình không báo gì cả:
 * nó chỉ hiện "không có dữ liệu" y như môn không tồn tại.
 */
const PAGE_SIZE = 50;

/** Chờ gõ xong rồi mới hỏi server — đủ để không bắn một request mỗi phím. */
const DEBOUNCE_MS = 300;

interface SubjectSelectProps {
  value?: string;
  /**
   * Nhãn của môn ĐANG CHỌN, do caller biết sẵn (vd trang sửa khoá đã có `subjectName`).
   *
   * Không có nó thì lần vẽ đầu tiên — trước khi trang danh mục nào tải xong — ô select chỉ có mỗi
   * `value` là một UUID, và antd không tìm được option nào khớp nên in thẳng UUID ra màn hình.
   * Người dùng thấy một chuỗi băm thay vì tên môn.
   */
  initialLabel?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function SubjectSelect({
  value,
  initialLabel,
  onChange,
  placeholder = "Chọn môn học",
  allowClear = true,
  disabled,
  style,
}: SubjectSelectProps) {
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setSearch(typed.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [typed]);

  // Tìm Ở SERVER (`filter.q`) thay vì lọc mảng đã tải: đó là cách duy nhất chạm tới môn nằm
  // ngoài 100 dòng đầu.
  const { data, isLoading } = useSubjects({ page: 1, pageSize: PAGE_SIZE, search: search || undefined });

  /**
   * Nhãn của môn ĐANG CHỌN, giữ lại kể cả khi nó rơi khỏi kết quả tìm hiện tại.
   *
   * Không giữ thì mở form sửa một đề của môn X, gõ tìm môn Y xong bỏ dở, ô select sẽ hiện trơ
   * một UUID (antd không còn option nào khớp `value`) — trông như dữ liệu hỏng.
   */
  const seen = useRef(new Map<string, string>());
  useEffect(() => {
    if (value && initialLabel) seen.current.set(value, initialLabel);
  }, [value, initialLabel]);
  useEffect(() => {
    for (const s of data?.items ?? []) seen.current.set(s.id, `${s.code} - ${s.name}`);
  }, [data]);

  const options = useMemo(() => {
    const list = (data?.items ?? []).map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
    if (value && !list.some((o) => o.value === value)) {
      list.unshift({ value, label: seen.current.get(value) ?? value });
    }
    return list;
  }, [data, value]);

  return (
    <Select
      loading={isLoading}
      disabled={disabled}
      allowClear={allowClear}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ minWidth: 200, ...style }}
      options={options}
      showSearch
      onSearch={setTyped}
      // Server đã lọc rồi; để antd lọc thêm lần nữa thì kết quả server trả về lại bị cắt bởi
      // chính chuỗi vừa gõ (vd gõ mã môn nhưng nhãn hiển thị là "MÃ - Tên" tiếng Việt).
      filterOption={false}
      notFoundContent={isLoading ? "Đang tìm…" : "Không có môn khớp"}
    />
  );
}
