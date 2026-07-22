import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Card, Col, Row, Skeleton, Tag, Typography } from "antd";
import { DollarOutlined, ReadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useMyCourseScopes, useTeachingCourses } from "../api/courseScopes";

export default function InstructorHomePage() {
  const { scopes, isLoading } = useMyCourseScopes();
  const { data: courses } = useTeachingCourses();
  const navigate = useNavigate();

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    (courses ?? []).forEach((c) => m.set(c.id, c.title));
    return m;
  }, [courses]);

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (scopes.length === 0) {
    return (
      <Alert
        type="warning"
        message="Không có khoá nào được gán"
        description="Quyền giảng dạy của bạn đã hết hạn hoặc chưa được gán. Liên hệ quản trị viên để gia hạn."
        showIcon
      />
    );
  }

  return (
    <div>
      <Typography.Title level={3}>Workspace Giảng viên</Typography.Title>
      <Row gutter={16}>
        <Col span={16}>
          <Card title="Khoá của tôi" style={{ marginBottom: 16 }}>
            {scopes.map((scope) => {
              const daysLeft = scope.expiresAt
                ? dayjs(scope.expiresAt).diff(dayjs(), "day")
                : Infinity;
              const nearExpiry = typeof daysLeft === "number" && daysLeft < 7;
              return (
                <Card
                  key={scope.scopeId}
                  hoverable
                  onClick={() => navigate(`/instructor/courses/${scope.scopeId}`)}
                  style={{ marginBottom: 12 }}
                >
                  <Typography.Title level={5} style={{ marginBottom: 4 }}>
                    {titleById.get(scope.scopeId) ?? scope.scopeId}
                  </Typography.Title>
                  <div>
                    {scope.permissions.map((p) => (
                      <Tag key={p} style={{ marginTop: 4 }}>
                        {p}
                      </Tag>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {nearExpiry ? (
                      <Tag color="orange">Hết hạn sau {daysLeft} ngày</Tag>
                    ) : (
                      <Typography.Text type="secondary">
                        Hết hạn:{" "}
                        {scope.expiresAt ? dayjs(scope.expiresAt).format("DD/MM/YYYY") : "—"}
                      </Typography.Text>
                    )}
                  </div>
                </Card>
              );
            })}
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
