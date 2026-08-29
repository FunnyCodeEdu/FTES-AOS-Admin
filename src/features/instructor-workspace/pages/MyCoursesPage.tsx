import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Empty, Skeleton, Space, Tag, Typography } from "antd";
import { UsergroupAddOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { useTeachingCourses } from "../api/courseScopes";
import type { TeachingCourse } from "../shared/types";
import type { Course, CourseStatus, CourseType } from "../../academic/types";
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
export default function MyCoursesPage() {
  const { data: courses, isLoading, isError, error } = useTeachingCourses();
  const navigate = useNavigate();
  const [grantCourse, setGrantCourse] = useState<Course | null>(null);

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
      render: (status: string) => <Tag>{status}</Tag>,
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
              Gate đúng quyền BE đang gác (`admin.course.manage`) — bày nút cho người không có quyền
              thì bấm xong chỉ nhận 403. */}
          <Can permissions={["admin.course.manage"]}>
            <Button
              type="primary"
              size="small"
              icon={<UsergroupAddOutlined />}
              onClick={() => setGrantCourse(toCourse(r))}
            >
              Thêm học viên
            </Button>
          </Can>
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
      <Typography.Title level={3}>Khoá của tôi</Typography.Title>
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

      <GrantEnrollmentModal
        open={grantCourse !== null}
        course={grantCourse}
        onClose={() => setGrantCourse(null)}
      />
    </div>
  );
}
