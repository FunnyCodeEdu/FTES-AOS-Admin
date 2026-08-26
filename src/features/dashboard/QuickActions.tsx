import { type ReactNode, useState } from "react";
import { Card, Typography } from "antd";
import { BookOutlined, RightOutlined, UserAddOutlined, WalletOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMe } from "../auth/api";
import { useIsMobile } from "../../shared/hooks/useIsMobile";
import { GrantEnrollmentModal } from "../academic/courses/components/GrantEnrollmentModal";
import type { Course } from "../academic/types";
import { QuickCoursePickerModal } from "./QuickCoursePickerModal";
import { MyCoursesQuickPanel } from "./MyCoursesQuickPanel";

interface QuickAction {
  key: string;
  icon: ReactNode;
  title: string;
  hint: string;
  /** Quyền cần có để THẤY thẻ (bất kỳ quyền nào trong danh sách là đủ). */
  permissions: string[];
  onClick: () => void;
  primary?: boolean;
}

/**
 * Khối "Việc hay làm" ở đầu trang chủ.
 *
 * <p>Ba việc chiếm gần hết thời gian của mentor: cấp học viên vào khoá, xem lương, sửa khoá học.
 * Trước đây cả ba nằm ở ba nhánh nav khác nhau — trên điện thoại là mở Drawer rồi cuộn tìm. Đặt
 * chúng ở phần đầu trang chủ vì đó là vùng màn hình đắt nhất, và đặt TRÊN lưới widget vì widget chỉ
 * để đọc còn đây là để bấm.
 *
 * <p>Thẻ khai báo dạng dữ liệu chứ không chép JSX ba lần, nên thêm việc thứ tư sau này là thêm một
 * phần tử mảng.
 */
export function QuickActions() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: me } = useMe();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [grantCourse, setGrantCourse] = useState<Course | null>(null);

  const permissions = new Set(me?.permissions ?? []);
  // superAdmin bypass sống ở engine BE chứ không nằm trong `me.permissions` (xem ghi chú ở Can.tsx),
  // nên phải tự cộng vào đây — không thì tài khoản super admin thuần lại không thấy lối tắt nào.
  const allow = (codes: string[]) => me?.superAdmin === true || codes.some((c) => permissions.has(c));

  const actions: QuickAction[] = [
    {
      key: "enroll",
      icon: <UserAddOutlined />,
      title: "Thêm học viên",
      hint: "Dán username, cấp hàng loạt",
      permissions: ["course.update", "admin.course.manage"],
      onClick: () => setPickerOpen(true),
      primary: true,
    },
    {
      key: "payroll",
      icon: <WalletOutlined />,
      title: "Xem lương",
      hint: "Bảng lương theo kỳ",
      permissions: ["payroll.manage", "payroll.read"],
      // Hai trang lương khác nhau: console tổng gác `payroll.manage`, còn giảng viên chỉ có
      // `payroll.read` nên phải đi trang self — trỏ nhầm là vào rồi ăn 403.
      onClick: () =>
        navigate(
          me?.superAdmin === true || permissions.has("payroll.manage")
            ? "/payroll"
            : "/instructor/earnings"
        ),
    },
    {
      key: "courses",
      icon: <BookOutlined />,
      title: "Quản lí khoá học",
      hint: "Sửa giá, gỡ học viên",
      permissions: ["admin.course.read", "course.manage", "course.content.edit"],
      onClick: () =>
        navigate(
          me?.superAdmin === true || permissions.has("admin.course.read")
            ? "/academic/courses"
            : "/instructor/courses"
        ),
    },
  ];

  const visible = actions.filter((a) => allow(a.permissions));

  return (
    <div style={{ marginBottom: 20 }}>
      {visible.length > 0 && (
        <>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Việc hay làm
      </Typography.Text>
      <div
        style={{
          display: "grid",
          // Điện thoại: mỗi việc một hàng full-width. Laptop: xếp ngang, tự co theo số thẻ hiển thị.
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
          gap: 10,
          marginTop: 8,
        }}
      >
        {visible.map((action) => (
          <Card
            key={action.key}
            hoverable
            size="small"
            onClick={action.onClick}
            styles={{ body: { padding: 14 } }}
            style={{
              minHeight: 64,
              cursor: "pointer",
              borderColor: action.primary ? "#3F51B5" : undefined,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontSize: 20,
                  color: action.primary ? "#3F51B5" : undefined,
                  display: "inline-flex",
                }}
              >
                {action.icon}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Typography.Text strong style={{ display: "block", fontSize: 15 }}>
                  {action.title}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {action.hint}
                </Typography.Text>
              </div>
              <RightOutlined style={{ fontSize: 12, opacity: 0.45 }} />
            </div>
          </Card>
        ))}
      </div>
        </>
      )}

      {/* Khoá đang dạy: lối vào NHANH nhất tới việc thêm học viên / sửa khoá của chính mình. */}
      <MyCoursesQuickPanel />

      <QuickCoursePickerModal
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        onPick={(course) => {
          setPickerOpen(false);
          setGrantCourse(course);
        }}
      />
      {/* Dùng lại đúng modal cấp học viên của trang khoá học — một luồng, một chỗ sửa. */}
      <GrantEnrollmentModal
        open={grantCourse !== null}
        course={grantCourse}
        onClose={() => setGrantCourse(null)}
      />
    </div>
  );
}
