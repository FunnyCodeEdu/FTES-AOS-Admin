import { useState } from "react";
import { Alert, Button, Card, Col, Empty, Row, Skeleton, Statistic, Table } from "antd";
import { ReloadOutlined, UserAddOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import type { TermAffectedCourse } from "../../types";
import { useTermAffected } from "../api/terms.api";
import { TermReAddStudentModal } from "./TermReAddStudentModal";

interface TermAffectedTabProps {
  termId: string;
}

/**
 * Tab "Ảnh hưởng": render `TermAffectedSummaryView` — tổng học viên ảnh hưởng + số khoá, và bảng
 * per-course (enrollment/purchase đang hoạt động). Mỗi khoá có nút "Cấp lại học viên" (gate
 * `term.manage`) mở modal cấp lại một học viên vào khoá đó.
 */
export function TermAffectedTab({ termId }: TermAffectedTabProps) {
  const { data, isLoading, isError, error, refetch } = useTermAffected(termId);
  const [reAddCourse, setReAddCourse] = useState<{ courseId: string; title: string } | null>(null);

  const columns: TableProps<TermAffectedCourse>["columns"] = [
    { title: "Khoá học", dataIndex: "title" },
    { title: "Enrollment đang hoạt động", dataIndex: "activeEnrollments", align: "center" },
    { title: "Purchase đang hoạt động", dataIndex: "activePurchases", align: "center" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record) => (
        <Can permissions={["term.manage"]}>
          <Button
            size="small"
            icon={<UserAddOutlined />}
            onClick={() => setReAddCourse({ courseId: record.courseId, title: record.title })}
          >
            Cấp lại học viên
          </Button>
        </Can>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  if (isError || !data) {
    return (
      <Alert
        type="error"
        message="Không thể tải dữ liệu ảnh hưởng"
        description={error?.message}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card>
            <Statistic title="Học viên bị ảnh hưởng" value={data.affectedActiveUsers} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic title="Số khoá trong kỳ" value={data.courseCount} />
          </Card>
        </Col>
      </Row>

      {data.courses.length > 0 ? (
        <Table
          rowKey="courseId"
          columns={columns}
          dataSource={data.courses}
          pagination={false}
        />
      ) : (
        <Empty description="Không có học viên bị ảnh hưởng" />
      )}

      <TermReAddStudentModal
        open={reAddCourse !== null}
        course={reAddCourse}
        onClose={() => setReAddCourse(null)}
      />
    </>
  );
}
