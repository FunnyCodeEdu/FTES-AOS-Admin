import { Empty, Typography } from "antd";
import { Link } from "react-router-dom";
import type { SubjectDetail } from "../../types";

interface ResourcesTabProps {
  subject: SubjectDetail;
}

export function ResourcesTab({ subject }: ResourcesTabProps) {
  return (
    <div>
      <Typography.Title level={5}>Học liệu của môn</Typography.Title>
      <Empty description="Danh sách học liệu được quản lý tại trang Học liệu">
        <Link to={`/academic/resources?subjectId=${subject.id}`}>Xem học liệu môn này</Link>
      </Empty>
    </div>
  );
}
