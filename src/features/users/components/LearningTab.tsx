import { Card, Empty, Skeleton, Statistic, Table } from "antd";
import dayjs from "dayjs";
import { useLearningSummary } from "../api/users.api";

interface LearningTabProps {
  userId: string;
}

export function LearningTab({ userId }: LearningTabProps) {
  const { data, isLoading } = useLearningSummary(userId);

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!data) return <Empty description="Không thể tải tóm tắt học tập" />;

  const columns = [
    { title: "Khoá học", dataIndex: "courseName" },
    {
      title: "Tiến độ",
      dataIndex: "progressPercent",
      render: (v: number) => `${v}%`,
    },
    {
      title: "Ghi danh lúc",
      dataIndex: "enrolledAt",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card>
          <Statistic title="Đã ghi danh" value={data.enrolledCount} />
        </Card>
        <Card>
          <Statistic title="Hoàn thành" value={data.completedCount} />
        </Card>
        <Card>
          <Statistic title="Chứng chỉ" value={data.certificates.length} />
        </Card>
      </div>
      <Table
        rowKey="courseId"
        columns={columns}
        dataSource={data.enrollments.items}
        pagination={{
          total: data.enrollments.total,
          pageSize: data.enrollments.pageSize,
          current: data.enrollments.page,
        }}
      />
    </div>
  );
}
