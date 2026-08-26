import { useState } from "react";
import { Button, Card, Modal, Skeleton, Tag, Typography } from "antd";
import { EditOutlined, RightOutlined, TeamOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTeachingCourses } from "../instructor-workspace/api/courseScopes";
import type { TeachingCourse } from "../instructor-workspace/shared/types";
import type { Course, CourseStatus, CourseType } from "../academic/types";
import { useIsMobile } from "../../shared/hooks/useIsMobile";
import { GrantEnrollmentModal } from "../academic/courses/components/GrantEnrollmentModal";

/**
 * `GET /courses/teaching` trả hình dạng riêng (title/totalPrice), còn modal cấp học viên nhận
 * `Course` của khu academic. Chuyển đổi ở ĐÚNG MỘT chỗ này thay vì nới lỏng kiểu của modal — modal
 * chỉ đọc id/name/saleMode, các trường còn lại điền giá trị trung tính.
 */
function toCourse(c: TeachingCourse): Course {
  return {
    id: c.id,
    subjectId: "",
    name: c.title,
    status: c.status as CourseStatus,
    workflowStatus: c.status as CourseStatus,
    lecturerIds: [],
    basePrice: c.totalPrice ?? undefined,
    salePrice: c.salePrice ?? undefined,
    saleMode: c.saleMode as CourseType,
    createdAt: "",
    updatedAt: "",
  };
}

function isPublished(status: string): boolean {
  return String(status ?? "").toLowerCase() === "published";
}

/**
 * "Khoá của tôi" ở trang chủ: mỗi khoá đang dạy là một hàng bấm được, mở ra bảng thao tác nhanh
 * gồm THÊM HỌC VIÊN và SỬA KHOÁ.
 *
 * <p>Trước đây muốn thêm một học viên vào khoá mình dạy phải: mở Drawer → Khoá học → tìm khoá →
 * cuộn ngang bảng → bấm nút nhỏ. Ở đây là hai chạm, ngay màn đầu tiên.
 *
 * <p>Danh sách lấy từ `GET /courses/teaching` — BE ép owner theo JWT, nên đây đúng là khoá của
 * chính người đang đăng nhập chứ không phải toàn bộ khoá trong hệ thống.
 */
export function MyCoursesQuickPanel() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data, isLoading, isError } = useTeachingCourses();

  const [sheetCourse, setSheetCourse] = useState<TeachingCourse | null>(null);
  const [grantCourse, setGrantCourse] = useState<Course | null>(null);

  if (isLoading) {
    return (
      <div style={{ marginBottom: 20 }}>
        <Skeleton active paragraph={{ rows: 2 }} />
      </div>
    );
  }

  // Tài khoản không dạy khoá nào (admin thuần) thì khối này im lặng biến mất — không bày một ô rỗng
  // chiếm chỗ ở phần đắt nhất của màn hình.
  const courses = data ?? [];
  if (isError || courses.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Khoá của tôi
        </Typography.Text>
        <Button type="link" size="small" onClick={() => navigate("/instructor/courses")}>
          Xem tất cả
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          // min(260px, 100%): cột không bao giờ rộng hơn khung. Chỉ `minmax(260px, 1fr)` thì trên
          // màn hẹp cột vẫn giữ 260px+ và thẻ tràn ra ngoài khung (đo được 403px trong khung 335px).
          gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
          gap: 10,
          marginTop: 4,
        }}
      >
        {/* Giới hạn 6 khoá: trang chủ là chỗ đi nhanh, không phải danh sách đầy đủ — còn lại nằm sau
            nút "Xem tất cả" ngay trên. */}
        {courses.slice(0, 6).map((course) => (
          <Card
            key={course.id}
            hoverable
            size="small"
            styles={{ body: { padding: 12 } }}
            style={{ minHeight: 60, cursor: "pointer" }}
            onClick={() => setSheetCourse(course)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Typography.Text strong ellipsis style={{ display: "block", fontSize: 14 }}>
                  {course.title}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  <Tag
                    color={isPublished(course.status) ? "green" : "default"}
                    style={{ marginInlineEnd: 6 }}
                  >
                    {isPublished(course.status) ? "Đang mở" : "Nháp"}
                  </Tag>
                  <TeamOutlined /> {course.totalUser} học viên
                </Typography.Text>
              </div>
              <RightOutlined style={{ fontSize: 12, opacity: 0.45 }} />
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={sheetCourse !== null}
        title={sheetCourse?.title}
        onCancel={() => setSheetCourse(null)}
        footer={null}
        destroyOnClose
        width={isMobile ? "96vw" : 420}
        // Neo sát đáy màn (vùng ngón cái). Phải đi qua class trên WRAP: rule .ant-modal trong
        // mobile.css dùng !important nên đặt `style={{top:"auto"}}` ở đây không có tác dụng.
        wrapClassName={isMobile ? "mobile-sheet" : undefined}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
          <Button
            type="primary"
            block
            size="large"
            icon={<UsergroupAddOutlined />}
            onClick={() => {
              if (!sheetCourse) return;
              setGrantCourse(toCourse(sheetCourse));
              setSheetCourse(null);
            }}
          >
            Thêm học viên
          </Button>
          <Button
            block
            size="large"
            icon={<EditOutlined />}
            onClick={() => {
              if (!sheetCourse) return;
              navigate(`/instructor/courses/${sheetCourse.id}`);
              setSheetCourse(null);
            }}
          >
            Sửa khoá học
          </Button>
        </div>
      </Modal>

      <GrantEnrollmentModal
        open={grantCourse !== null}
        course={grantCourse}
        onClose={() => setGrantCourse(null)}
      />
    </div>
  );
}
