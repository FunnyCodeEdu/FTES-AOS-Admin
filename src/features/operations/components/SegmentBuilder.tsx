import { Alert, Form, Radio, Select, Space } from "antd";
import type { BroadcastSegment } from "../shared/types";
import { segmentForMode, segmentModeOf } from "../shared/broadcastRules";

interface SegmentBuilderProps {
  value: BroadcastSegment;
  onChange: (value: BroadcastSegment) => void;
}

const ROLE_OPTIONS = [
  { label: "Học viên", value: "STUDENT" },
  { label: "Giảng viên", value: "LECTURER" },
  { label: "Cộng tác viên", value: "CTV" },
  { label: "Kiểm duyệt viên", value: "MODERATOR" },
  { label: "Quản trị viên", value: "ADMIN" },
];

/**
 * Chọn tệp người nhận. Hai chế độ tách bạch, admin phải chọn rõ một trong hai.
 *
 * Vì sao là radio chứ không phải "để trống ô vai trò nghĩa là tất cả": bản trước đúng là như vậy —
 * ô vai trò trống kèm placeholder "Tất cả vai trò" — và đó là cái bẫy. Ô trống cũng là trạng thái
 * MẶC ĐỊNH khi vừa mở trang, nên "chưa chọn gì" và "cố ý gửi cho toàn hệ thống" trông giống hệt
 * nhau. Với thao tác không thu hồi được thì hai ý đó phải nhìn khác nhau. (Backend cũng từ chối
 * segment rỗng, nên thực tế bản cũ còn báo 400 ngay khi bấm Preview lúc vừa mở trang.)
 *
 * "Tất cả người dùng" KHÔNG đồng nghĩa với chọn hết 5 vai trò: tài khoản không giữ vai trò nào vẫn
 * là người dùng thật, và chỉ chế độ này mới với tới họ.
 */
export function SegmentBuilder({ value, onChange }: SegmentBuilderProps) {
  const mode = segmentModeOf(value);

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Form.Item label="Gửi tới">
        <Radio.Group
          value={mode}
          // Đổi chế độ thì xoá hẳn dữ liệu của chế độ kia — xem segmentForMode.
          onChange={(e) => onChange(segmentForMode(e.target.value))}
        >
          <Radio.Button value="roles">Theo vai trò</Radio.Button>
          <Radio.Button value="all">Tất cả người dùng</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {mode === "all" ? (
        <Alert
          type="warning"
          showIcon
          message="Gửi tới toàn bộ tài khoản đang hoạt động"
          description="Bao gồm cả tài khoản không thuộc vai trò nào. Không loại trừ ai, và không thu hồi được sau khi gửi."
        />
      ) : (
        <Form.Item
          label="Vai trò"
          required
          help="Phải chọn ít nhất một vai trò. Muốn gửi cho mọi người thì đổi sang 'Tất cả người dùng'."
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="Chọn vai trò nhận thông báo"
            options={ROLE_OPTIONS}
            value={value.roles ?? []}
            onChange={(roles) => onChange({ ...value, allUsers: false, roles })}
            style={{ width: "100%" }}
          />
        </Form.Item>
      )}
    </Space>
  );
}
