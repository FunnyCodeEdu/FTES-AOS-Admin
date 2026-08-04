import { useState } from "react";
import { Alert, Button, Empty, Modal, Skeleton, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { Can } from "../../../../shared/permissions";
import { CourseSelect } from "../../components/CourseSelect";
import type { TermCourseView } from "../../types";
import { useAddTermCourse, useRemoveTermCourse, useTermCourses } from "../api/terms.api";

interface TermCoursesTabProps {
  termId: string;
}

/**
 * Tab "Khóa học trong kỳ": liệt kê `TermCourseView`, thêm khoá qua `CourseSelect` (ẩn khoá đã có),
 * gỡ khoá có confirm. Ghi gate `term.manage`. Lỗi `TERM_COURSE_CONFLICT` (khoá đã thuộc kỳ non-ended
 * khác) đã map tiếng Việt trong `handleAdminMutationError` (notification) — list giữ nguyên.
 */
export function TermCoursesTab({ termId }: TermCoursesTabProps) {
  const { data, isLoading, isError, error, refetch } = useTermCourses(termId);
  const addCourse = useAddTermCourse(termId);
  const removeCourse = useRemoveTermCourse(termId);
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);

  const linkedIds = (data ?? []).map((c) => c.courseId);

  const handleAdd = () => {
    if (!selectedCourseId) {
      message.warning("Chọn một khoá học để thêm");
      return;
    }
    if (linkedIds.includes(selectedCourseId)) {
      message.warning("Khoá học này đã có trong kỳ");
      return;
    }
    addCourse.mutate(
      { courseId: selectedCourseId },
      {
        onSuccess: () => {
          message.success("Đã thêm khoá vào kỳ");
          setSelectedCourseId(undefined);
        },
        // onError đã có notification bản địa hoá (gồm TERM_COURSE_CONFLICT) trong hook.
      }
    );
  };

  const handleRemove = (course: TermCourseView) => {
    Modal.confirm({
      title: "Gỡ khoá khỏi kỳ",
      content: (
        <>
          Gỡ khoá <strong>{course.title}</strong> khỏi kỳ học? Khoá không bị xoá; chỉ tháo liên kết
          với kỳ này.
        </>
      ),
      okText: "Gỡ",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () =>
        removeCourse.mutateAsync(course.courseId).then(() => {
          message.success("Đã gỡ khoá khỏi kỳ");
        }),
    });
  };

  const columns: TableProps<TermCourseView>["columns"] = [
    { title: "Khoá học", dataIndex: "title" },
    {
      title: "Slug",
      dataIndex: "slugName",
      render: (slug: string) => (
        <Typography.Text copyable code>
          {slug}
        </Typography.Text>
      ),
    },
    {
      title: "Trạng thái khoá",
      dataIndex: "courseStatus",
      render: (status: string) => <Tag>{status}</Tag>,
    },
    {
      title: "Thêm lúc",
      dataIndex: "addedAt",
      render: (addedAt: string) => dayjs(addedAt).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record) => (
        <Can permissions={["term.manage"]}>
          <Button size="small" danger onClick={() => handleRemove(record)}>
            Gỡ
          </Button>
        </Can>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  if (isError) {
    return (
      <Alert
        type="error"
        message="Không thể tải danh sách khoá trong kỳ"
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
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Can permissions={["term.manage"]}>
        <Space wrap>
          <CourseSelect
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            excludeIds={linkedIds}
            placeholder="Chọn khoá để thêm vào kỳ"
            style={{ minWidth: 320 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={addCourse.isPending}
            onClick={handleAdd}
          >
            Thêm khoá
          </Button>
        </Space>
      </Can>

      {data && data.length > 0 ? (
        <Table rowKey="courseId" columns={columns} dataSource={data} pagination={false} />
      ) : (
        <Empty description="Chưa có khoá nào trong kỳ" />
      )}
    </Space>
  );
}
