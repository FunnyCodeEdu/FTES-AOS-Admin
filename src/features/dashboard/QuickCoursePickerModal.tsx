import { useMemo, useState } from "react";
import { Button, Empty, Input, List, Modal, Skeleton, Tag, Typography } from "antd";
import { SearchOutlined, UserAddOutlined } from "@ant-design/icons";
import { useCourses } from "../academic/courses/api/courses.api";
import type { Course } from "../academic/types";
import { useIsMobile } from "../../shared/hooks/useIsMobile";

/**
 * BE trả status hoa (`PUBLISHED`) còn type FE khai chữ thường — mapper `useCourses` ép kiểu chứ
 * không đổi giá trị, nên so sánh phải bỏ qua hoa/thường (CourseTable cũng làm y vậy).
 */
function isPublished(course: Course): boolean {
  return String(course.status ?? "").toLowerCase() === "published";
}

interface QuickCoursePickerModalProps {
  open: boolean;
  onCancel: () => void;
  onPick: (course: Course) => void;
}

/**
 * Bước "khoá nào?" của lối tắt Thêm học viên ở trang chủ.
 *
 * <p>Chỉ có ô tìm + danh sách bấm được: từ trang chủ tới ô dán username đúng hai chạm. Không bày
 * bộ lọc trạng thái/môn ở đây — người đã biết mình muốn khoá nào thì gõ tên, còn muốn lọc thì đi
 * trang khoá học.
 */
export function QuickCoursePickerModal({ open, onCancel, onPick }: QuickCoursePickerModalProps) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");

  const params = useMemo(
    () => ({ search: search.trim() || undefined, page: 1, pageSize: 20 }),
    [search]
  );
  // `enabled` không cần: modal đóng thì component vẫn mount nhưng query dùng chung cache với trang
  // khoá học, nên đây thường là cache hit chứ không phải request mới.
  const { data, isLoading } = useCourses(params);
  const courses = data?.items ?? [];

  return (
    <Modal
      open={open}
      title="Chọn khoá học"
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={isMobile ? "96vw" : 560}
      style={isMobile ? { top: 8, maxWidth: "96vw" } : undefined}
    >
      <Input
        allowClear
        autoFocus={!isMobile}
        size="large"
        prefix={<SearchOutlined />}
        placeholder="Tìm theo tên khoá học"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : courses.length === 0 ? (
        <Empty description="Không tìm thấy khoá học nào" />
      ) : (
        <List
          dataSource={courses}
          style={{ maxHeight: "50vh", overflowY: "auto" }}
          renderItem={(course) => (
            <List.Item style={{ padding: "8px 0" }}>
              <Button
                block
                size="large"
                icon={<UserAddOutlined />}
                onClick={() => onPick(course)}
                style={{ height: "auto", padding: "10px 12px", textAlign: "left" }}
              >
                <span style={{ display: "inline-flex", flexDirection: "column", minWidth: 0 }}>
                  <Typography.Text strong ellipsis style={{ maxWidth: "100%" }}>
                    {course.name}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <Tag color={isPublished(course) ? "green" : "default"} style={{ marginInlineEnd: 6 }}>
                      {isPublished(course) ? "Đang mở" : "Nháp"}
                    </Tag>
                    {course.saleMode === "PACKAGE" ? "Bán theo gói" : "Bán trọn khoá"}
                  </Typography.Text>
                </span>
              </Button>
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}
