import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, App, Button, Card, Empty, Popconfirm, Skeleton, Space, Tag, Tooltip, Typography } from "antd";
import { PlusOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { useSubmitCourseForReview, useTeachingCourses } from "../api/courseScopes";
import { useCreateCourse } from "../../academic/courses/api/courses.api";
import { CourseFormModal } from "../../academic/courses/components/CourseFormModal";
import type { TeachingCourse } from "../shared/types";
import type { Course, CourseFormValues, CourseStatus, CourseType } from "../../academic/types";
import { GrantEnrollmentModal } from "../../academic/courses/components/GrantEnrollmentModal";
import { Can } from "../../../shared/permissions";
import { MobileCard } from "../../../shared/components/MobileCard";
import { ResponsiveTable } from "../../../shared/components/ResponsiveTable";

/**
 * `/courses/teaching` trả hình dạng riêng (title/totalPrice) còn modal cấp học viên nhận `Course`
 * của khu academic — modal chỉ đọc id/name/saleMode, phần còn lại điền giá trị trung tính.
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

interface CourseRow extends TeachingCourse {
  key: string;
}

/**
 * MyCourses: khoá caller SỞ HỮU (`/courses/teaching`, owner ép theo JWT ở BE). Key off OWNERSHIP —
 * KHÔNG còn giao với COURSE-scope grant (owner thuần không có grant vẫn thấy khoá của mình). Nút "Mở"
 * điều hướng sang chi tiết (GET /courses/{id}/manage tự gác owner-authz ở BE).
 */
/** Nhãn + màu trạng thái khoá, gồm cả REVIEW của luồng mentor gửi duyệt. */
const STATUS_META: Record<string, { label: string; color?: string }> = {
  DRAFT: { label: "Nháp" },
  REVIEW: { label: "Chờ duyệt", color: "gold" },
  PUBLISHED: { label: "Đã publish", color: "green" },
  INACTIVE: { label: "Đã gỡ xuống", color: "orange" },
  ARCHIVED: { label: "Lưu trữ" },
};

export default function MyCoursesPage() {
  const { data: courses, isLoading, isError, error } = useTeachingCourses();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [grantCourse, setGrantCourse] = useState<Course | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const createCourse = useCreateCourse();
  const submitReview = useSubmitCourseForReview();

  const rows = useMemo<CourseRow[]>(
    () => (courses ?? []).map((c) => ({ ...c, key: c.id })),
    [courses]
  );

  const columns: TableProps<CourseRow>["columns"] = [
    {
      title: "Tên khoá",
      dataIndex: "title",
      key: "title",
      render: (title: string, r) => (
        <div>
          <Typography.Text strong>{title}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{r.courseCode}</Typography.Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string, r) => {
        const meta = STATUS_META[status] ?? { label: status };
        const tag = <Tag color={meta.color}>{meta.label}</Tag>;
        // Khoá bị trả lại PHẢI hiện lý do ngay cạnh trạng thái — không hiện thì giảng viên chỉ thấy
        // khoá quay về nháp mà không biết vì sao, rồi gửi lại y nguyên.
        return r.reviewNote ? (
          <Tooltip title={r.reviewNote}>
            <Space size={4}>
              {tag}
              <Typography.Text type="danger" style={{ fontSize: 12 }}>
                bị trả lại
              </Typography.Text>
            </Space>
          </Tooltip>
        ) : (
          tag
        );
      },
    },
    {
      title: "Học viên",
      dataIndex: "totalUser",
      key: "totalUser",
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, r) => (
        <Space>
          {/* Thêm học viên NGAY TẠI ĐÂY: trước đó trang này chỉ có nút "Mở", nên muốn cấp một học
              viên vào khoá của chính mình vẫn phải vòng sang khu quản trị khoá học.

              mentor-grant-enrollment (01/09/2026): gate cũ CHỈ nhận `admin.course.manage` — quyền
              TOÀN CỤC mà LECTURER không có một chút nào, nên nút bị ẩn khỏi đúng người cần nó, và
              ai vào được bằng đường khác thì ăn "bạn không có quyền". BE nay cho phép người quản lý
              CHÍNH KHOÁ ĐÓ (chủ khoá / grant phạm vi COURSE) — xem
              AdminContentController.requireCourseGrantAccess — nên gate ở đây nhận thêm
              `course.content.edit` (bộ quyền của LECTURER). Can dùng hasAny nên đây là HOẶC.
              Trang này vốn chỉ liệt kê khoá của chính caller, và BE vẫn kiểm từng khoá độc lập. */}
          <Can permissions={["admin.course.manage", "course.content.edit"]}>
            <Button
              type="primary"
              size="small"
              icon={<UsergroupAddOutlined />}
              onClick={() => setGrantCourse(toCourse(r))}
            >
              Thêm học viên
            </Button>
          </Can>
          {/* Gửi duyệt CHỈ hiện ở khoá nháp — BE cũng chỉ nhận từ DRAFT, bày nút ở trạng thái khác
              là mời người dùng bấm để nhận lỗi. */}
          {r.status === "DRAFT" && (
            <Popconfirm
              title="Gửi khoá này cho admin duyệt?"
              description="Sau khi gửi, khoá chuyển sang Chờ duyệt."
              okText="Gửi duyệt"
              cancelText="Huỷ"
              onConfirm={() =>
                submitReview.mutate(r.id, {
                  onSuccess: () => message.success("Đã gửi khoá cho admin duyệt"),
                  onError: (e: Error) => message.error(e.message || "Gửi duyệt thất bại"),
                })
              }
            >
              <Button size="small" loading={submitReview.isPending}>
                Gửi duyệt
              </Button>
            </Popconfirm>
          )}
          <Button onClick={() => navigate(`/instructor/courses/${r.id}`)}>Mở</Button>
        </Space>
      ),
    },
  ];

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  if (isError) {
    return <Alert type="error" message="Không thể tải danh sách khoá" description={error?.message} showIcon />;
  }

  return (
    <div>
      <Space align="center" style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Khoá của tôi
        </Typography.Title>
        {/* course-review-workflow: lối tạo khoá cho giảng viên. Trước đây nút "Tạo khoá học" CHỈ nằm
            ở /academic/courses — route gác `admin.course.read`, mà LECTURER không có một quyền
            `admin.*` nào, nên giảng viên không có đường nào tạo khoá. */}
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          Tạo khoá học
        </Button>
      </Space>
      <Card>
        {rows.length === 0 ? (
          <Empty description="Bạn chưa phụ trách khoá nào" />
        ) : (
          <ResponsiveTable<CourseRow>
            columns={columns}
            dataSource={rows}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            scroll={{ x: "max-content" }}
            renderMobileCard={(course) => (
              <MobileCard
                title={course.title}
                subtitle={
                  <>
                    <Tag style={{ marginInlineEnd: 6 }}>{course.status}</Tag>
                    {course.courseCode}
                  </>
                }
                meta={[{ label: "Học viên", value: `${course.totalUser} người` }]}
                primaryAction={
                  <Can permissions={["admin.course.manage"]}>
                    <Button
                      type="primary"
                      block
                      size="large"
                      icon={<UsergroupAddOutlined />}
                      onClick={() => setGrantCourse(toCourse(course))}
                    >
                      Thêm học viên
                    </Button>
                  </Can>
                }
                actions={
                  <Button block onClick={() => navigate(`/instructor/courses/${course.id}`)}>
                    Mở khoá học
                  </Button>
                }
              />
            )}
          />
        )}
      </Card>

      <CourseFormModal
        open={formOpen}
        course={null}
        onClose={() => setFormOpen(false)}
        onSubmit={(values: CourseFormValues) =>
          createCourse.mutate(values, {
            onSuccess: () => {
              message.success("Đã tạo khoá ở trạng thái nháp — soạn xong thì bấm Gửi duyệt");
              setFormOpen(false);
            },
            onError: (e: Error) => message.error(e.message || "Tạo khoá thất bại"),
          })
        }
        isSubmitting={createCourse.isPending}
      />

      <GrantEnrollmentModal
        open={grantCourse !== null}
        course={grantCourse}
        onClose={() => setGrantCourse(null)}
      />
    </div>
  );
}
