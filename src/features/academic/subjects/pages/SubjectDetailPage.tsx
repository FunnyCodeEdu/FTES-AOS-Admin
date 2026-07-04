import { useParams } from "react-router-dom";
import { Alert, Button, Card, Skeleton, Tabs, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useSubject } from "../api/subjects.api";
import { OutcomesTab } from "../components/OutcomesTab";
import { PrerequisitesTab } from "../components/PrerequisitesTab";
import { ResourcesTab } from "../components/ResourcesTab";
import { StaffTab } from "../components/StaffTab";
import { SubjectInfoTab } from "../components/SubjectInfoTab";

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: subject, isLoading, isError, error, refetch } = useSubject(id);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (isError || !subject) {
    return (
      <Alert
        type="error"
        message="Không thể tải thông tin môn học"
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
    { key: "info", label: "Thông tin", children: <SubjectInfoTab subject={subject} /> },
    { key: "outcomes", label: "Learning outcomes", children: <OutcomesTab subject={subject} /> },
    { key: "prerequisites", label: "Prerequisites", children: <PrerequisitesTab subject={subject} /> },
    { key: "staff", label: "Nhân sự", children: <StaffTab subject={subject} /> },
    { key: "resources", label: "Resources", children: <ResourcesTab subject={subject} /> },
  ];

  return (
    <div>
      <Typography.Title level={3}>{subject.name}</Typography.Title>
      <Typography.Text type="secondary" code>
        {subject.code}
      </Typography.Text>
      <Card style={{ marginTop: 16 }}>
        <Tabs items={items} />
      </Card>
    </div>
  );
}
