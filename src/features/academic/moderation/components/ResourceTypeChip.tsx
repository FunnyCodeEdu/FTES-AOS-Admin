import { Tag } from "antd";
import { RESOURCE_TYPE_OPTIONS } from "../../resources/constants";
import type { ResourceType } from "../../types";

/**
 * Chip loại học liệu. Nhãn lấy từ `RESOURCE_TYPE_OPTIONS` (nguồn dùng chung với form tạo học liệu)
 * để chữ trong hàng đợi không lệch với chữ lúc người dùng chọn loại.
 *
 * PE/FE — đề thi do người học đóng góp — tô nổi (đỏ/tím + đậm) vì đó là thứ người duyệt phải soi kỹ
 * nhất: đề FE là album ảnh cần xem từng tấm, đề PE là bài nộp AI sẽ chấm. Học liệu thường
 * (PDF/slide/video…) để Tag mặc định cho khỏi nhiễu.
 */
const HIGHLIGHTED: Partial<Record<ResourceType, string>> = {
  PE: "volcano",
  FE: "purple",
};

interface ResourceTypeChipProps {
  type: ResourceType;
}

export function ResourceTypeChip({ type }: ResourceTypeChipProps) {
  const label = RESOURCE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
  const color = HIGHLIGHTED[type];
  return (
    <Tag color={color} style={color ? { fontWeight: 600 } : undefined}>
      {label}
    </Tag>
  );
}
