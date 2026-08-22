import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Card, Col, Empty, Row, Skeleton, Tag, Typography } from "antd";
import { DollarOutlined, ReadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useMyCourseScopes, useTeachingCourses } from "../api/courseScopes";
import type { MyCourseScope, TeachingCourse } from "../shared/types";

/** Một dòng "khoá của tôi" trên trang chủ workspace, bất kể đến từ ownership hay từ scoped grant. */
interface WorkspaceCourse {
  id: string;
  title: string;
  /** Chỉ có với khoá đến từ COURSE-scope grant; khoá SỞ HỮU không hết hạn nên bỏ trống. */
  expiresAt?: string;
  /** Nhãn quyền của scoped grant; khoá sở hữu hiện "Chủ khoá". */
  tags: string[];
}

/**
 * Gộp HAI nguồn khoá của một giảng viên:
 *  1. OWNERSHIP — `GET /courses/teaching` (BE ép owner theo JWT). Đây là nguồn CHÍNH.
 *  2. COURSE-scope grant trong `me.scopedGrants` — người được giao quản một khoá không phải của mình.
 *
 * Vì sao phải gộp: trang này trước đây chỉ đọc nguồn (2) và `return` sớm cảnh báo "Không có khoá nào
 * được gán" khi rỗng. Nhưng giảng viên owner THUẦN có ZERO scoped grant (ownership nằm ở cột
 * `instructor_id`, không phải trong bảng grant), nên với đúng persona chính của trang thì toàn bộ nội
 * dung — kể cả thẻ "Lương của tôi" — không bao giờ render. Đó là lý do "chưa thấy lương".
 */
export function mergeCourses(scopes: MyCourseScope[], courses: TeachingCourse[]): WorkspaceCourse[] {
  const byId = new Map<string, WorkspaceCourse>();
  courses.forEach((c) => byId.set(c.id, { id: c.id, title: c.title, tags: ["Chủ khoá"] }));
  scopes.forEach((s) => {
    const existing = byId.get(s.scopeId);
    if (existing) {
      existing.expiresAt = s.expiresAt || undefined;
      existing.tags = [...existing.tags, ...s.permissions];
      return;
    }
    byId.set(s.scopeId, {
      id: s.scopeId,
      title: s.scopeName || s.scopeId,
      expiresAt: s.expiresAt || undefined,
      tags: s.permissions,
    });
  });
  return Array.from(byId.values());
}

export default function InstructorHomePage() {
  const { scopes, isLoading: scopesLoading } = useMyCourseScopes();
  const { data: courses, isLoading: coursesLoading, isError, error } = useTeachingCourses();
  const navigate = useNavigate();

  const rows = useMemo(() => mergeCourses(scopes, courses ?? []), [scopes, courses]);
  const isLoading = scopesLoading || coursesLoading;

  return (
    <div>
      <Typography.Title level={3}>Workspace Giảng viên</Typography.Title>
      <Row gutter={16}>
        <Col span={16}>
          <Card title="Khoá của tôi" style={{ marginBottom: 16 }}>
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : isError ? (
              <Alert
                type="error"
                message="Không tải được danh sách khoá"
                description={error?.message}
                showIcon
              />
            ) : rows.length === 0 ? (
              // Rỗng THẬT (không sở hữu khoá nào, cũng không được giao khoá nào) — vẫn chỉ là một ô
              // rỗng trong thẻ này, KHÔNG chặn cả trang: lương và các lối đi khác không liên quan gì
              // tới việc có khoá hay không.
              <Empty description="Bạn chưa phụ trách khoá nào. Liên hệ quản trị viên nếu đây là nhầm lẫn." />
            ) : (
              rows.map((row) => {
                const daysLeft = row.expiresAt ? dayjs(row.expiresAt).diff(dayjs(), "day") : null;
                const nearExpiry = daysLeft !== null && daysLeft < 7;
                return (
                  <Card
                    key={row.id}
                    hoverable
                    onClick={() => navigate(`/instructor/courses/${row.id}`)}
                    style={{ marginBottom: 12 }}
                  >
                    <Typography.Title level={5} style={{ marginBottom: 4 }}>
                      {row.title}
                    </Typography.Title>
                    <div>
                      {row.tags.map((t) => (
                        <Tag key={t} style={{ marginTop: 4 }}>
                          {t}
                        </Tag>
                      ))}
                    </div>
                    {row.expiresAt && (
                      <div style={{ marginTop: 8 }}>
                        {nearExpiry ? (
                          <Tag color="orange">Hết hạn sau {daysLeft} ngày</Tag>
                        ) : (
                          <Typography.Text type="secondary">
                            Hết hạn: {dayjs(row.expiresAt).format("DD/MM/YYYY")}
                          </Typography.Text>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card
            hoverable
            onClick={() => navigate("/instructor/courses")}
            style={{ marginBottom: 16 }}
          >
            <Typography.Title level={5}>
              <ReadOutlined /> Khoá của tôi
            </Typography.Title>
            <Typography.Text type="secondary">
              Danh sách và quản lý các khoá bạn phụ trách.
            </Typography.Text>
          </Card>
          <Card hoverable onClick={() => navigate("/instructor/earnings")}>
            <Typography.Title level={5}>
              <DollarOutlined /> Lương của tôi
            </Typography.Title>
            <Typography.Text type="secondary">
              Xem bảng lương và yêu cầu chi trả.
            </Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
