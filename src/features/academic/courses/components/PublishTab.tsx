import { useState } from "react";
import { Badge, Button, Card, Form, Input, List, Modal, Space, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { ApiError } from "../../../../shared/api/client";
import type { CourseDetail } from "../../types";
import { usePublishCourse, useUnpublishCourse } from "../api/courses.api";

interface PublishTabProps {
  course: CourseDetail;
  readOnly?: boolean;
}

export function PublishTab({ course, readOnly }: PublishTabProps) {
  const publish = usePublishCourse(course.id);
  const unpublish = useUnpublishCourse(course.id);
  const [checklist, setChecklist] = useState<CourseDetail["publishChecklist"]>(course.publishChecklist ?? []);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [unpublishForm] = Form.useForm<{ reason: string }>();
  const unpublishReason = Form.useWatch("reason", unpublishForm);

  const handlePublish = () => {
    Modal.confirm({
      title: "Publish khoá học",
      content: (
        <>
          Sau khi publish, khoá học <strong>{course.name}</strong> sẽ hiển thị với học viên và giá có hiệu lực.
          Hành động này được ghi audit.
        </>
      ),
      okText: "Publish",
      onOk: () => {
        publish.mutate(
          { note: "" },
          {
            onSuccess: () => message.success("Đã publish khoá học"),
            onError: (err: Error) => {
              const code = err instanceof ApiError ? err.code : undefined;
              if (code === 422) {
                // BE expected to return checklist in message or data; data already unwrapped by interceptor
                setChecklist(course.publishChecklist ?? []);
              }
              message.error(err.message || "Publish thất bại");
            },
          }
        );
      },
    });
  };

  const handleUnpublishOk = () => {
    unpublishForm.validateFields().then(({ reason }) => {
      unpublish.mutate(
        { reason },
        {
          onSuccess: () => {
            message.success("Đã unpublish khoá học");
            unpublishForm.resetFields();
            setUnpublishOpen(false);
          },
          onError: (err: Error) => message.error(err.message || "Unpublish thất bại"),
        }
      );
    });
  };

  return (
    <div>
      <Typography.Title level={5}>Publish workflow</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Badge
          status={course.workflowStatus === "published" ? "success" : "default"}
          text={
            course.workflowStatus === "published"
              ? "Đã publish"
              : course.workflowStatus === "review"
                ? "Chờ duyệt"
                : "Bản nháp"
          }
        />
      </Space>

      <Card title="Checklist" style={{ marginBottom: 16 }}>
        <List
          dataSource={checklist}
          renderItem={(item) => (
            <List.Item>
              <Space>
                {item.passed ? (
                  <CheckCircleOutlined style={{ color: "green" }} />
                ) : (
                  <CloseCircleOutlined style={{ color: "red" }} />
                )}
                <Typography.Text delete={item.passed}>{item.label}</Typography.Text>
                {!item.passed && <Tag color="error">Chưa đạt</Tag>}
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Can permissions={["course.publish"]}>
        {!readOnly && (
          <Space>
            {course.workflowStatus !== "published" && (
              <Button type="primary" onClick={handlePublish} loading={publish.isPending}>
                Publish
              </Button>
            )}
            {course.workflowStatus === "published" && (
              <Button danger onClick={() => setUnpublishOpen(true)} loading={unpublish.isPending}>
                Unpublish
              </Button>
            )}
          </Space>
        )}
      </Can>

      <Modal
        title="Unpublish khoá học"
        open={unpublishOpen}
        onCancel={() => {
          setUnpublishOpen(false);
          unpublishForm.resetFields();
        }}
        onOk={handleUnpublishOk}
        confirmLoading={unpublish.isPending}
        okText="Unpublish"
        okButtonProps={{ danger: true, disabled: !unpublishReason?.trim() }}
      >
        <Typography.Paragraph type="danger">
          Khoá học <strong>{course.name}</strong> sẽ ẩn khỏi học viên. Hành động được ghi audit.
        </Typography.Paragraph>
        <Form form={unpublishForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do unpublish"
            rules={[
              { required: true, message: "Vui lòng nhập lý do" },
              { min: 5, message: "Lý do phải có ít nhất 5 ký tự" },
            ]}
          >
            <Input.TextArea
              rows={3}
              autoFocus
              placeholder="Khoá học sẽ ẩn khỏi học viên. Vui lòng nhập lý do."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
