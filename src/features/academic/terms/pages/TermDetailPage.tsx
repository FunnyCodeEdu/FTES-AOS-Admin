import { useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Space, Tabs, Typography } from "antd";
import { EditOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Can } from "../../../../shared/permissions";
import { useTerm } from "../api/terms.api";
import { TermAffectedTab } from "../components/TermAffectedTab";
import { TermCoursesTab } from "../components/TermCoursesTab";
import { TermFormModal } from "../components/TermFormModal";
import { TermStatusTag } from "../components/TermStatusTag";

function formatInstant(iso: string | null): string {
  return iso ? dayjs(iso).format("DD/MM/YYYY HH:mm") : "—";
}

export default function TermDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: term, isLoading, isError, error, refetch } = useTerm(id);
  const [formOpen, setFormOpen] = useState(false);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (isError || !term) {
    return (
      <Alert
        type="error"
        message="Không thể tải thông tin kỳ học"
        description={error?.message}
        action={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const items = [
    {
      key: "courses",
      label: "Khóa học trong kỳ",
      children: <TermCoursesTab termId={term.id} />,
    },
    {
      key: "affected",
      label: "Ảnh hưởng",
      children: <TermAffectedTab termId={term.id} />,
    },
  ];

  return (
    <div>
      <Space align="center" wrap style={{ justifyContent: "space-between", width: "100%" }}>
        <Space direction="vertical" size={0}>
          <Space align="center">
            <Typography.Title level={3} style={{ margin: 0 }}>
              {term.name}
            </Typography.Title>
            <TermStatusTag status={term.status} />
          </Space>
          <Typography.Text type="secondary" code>
            {term.code}
          </Typography.Text>
        </Space>
        <Can permissions={["term.manage"]}>
          <Button icon={<EditOutlined />} onClick={() => setFormOpen(true)}>
            Sửa kỳ
          </Button>
        </Can>
      </Space>

      <Card style={{ marginTop: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="Bắt đầu">{formatInstant(term.startsAt)}</Descriptions.Item>
          <Descriptions.Item label="Kết thúc">{formatInstant(term.endsAt)}</Descriptions.Item>
          <Descriptions.Item label="Nhắc trước (ngày)">{term.reminderLeadDays}</Descriptions.Item>
          <Descriptions.Item label="Số khoá">{term.courseCount}</Descriptions.Item>
          <Descriptions.Item label="Đã nhắc lúc">{formatInstant(term.remindedAt)}</Descriptions.Item>
          <Descriptions.Item label="Đã kết thúc lúc">{formatInstant(term.expiredAt)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Tabs items={items} />
      </Card>

      <TermFormModal open={formOpen} term={term} onClose={() => setFormOpen(false)} />
    </div>
  );
}
