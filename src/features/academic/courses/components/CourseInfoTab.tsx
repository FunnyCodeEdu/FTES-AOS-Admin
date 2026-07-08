import { useEffect } from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { Can } from "../../../../shared/permissions";
import type { CourseDetail, CourseFormValues } from "../../types";
import { useUpdateCourse } from "../api/courses.api";

interface CourseInfoTabProps {
  course: CourseDetail;
  readOnly?: boolean;
}

export function CourseInfoTab({ course, readOnly }: CourseInfoTabProps) {
  const [form] = Form.useForm<CourseFormValues>();
  const update = useUpdateCourse(course.id);

  useEffect(() => {
    form.setFieldsValue({
      subjectId: course.subjectId,
      name: course.name,
      summary: course.summary,
    });
  }, [course, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      update.mutate(values, {
        onSuccess: () => message.success("Đã cập nhật khoá học"),
        onError: (err: Error) => message.error(err.message || "Lưu thất bại"),
      });
    });
  };

  return (
    <div>
      <Typography.Title level={5}>Tổng quan</Typography.Title>
      <Form form={form} layout="vertical">
        <Form.Item name="subjectId" label="Môn học">
          <Input disabled />
        </Form.Item>
        <Form.Item name="name" label="Tên khoá học" rules={[{ required: true }]}>
          <Input disabled={readOnly} />
        </Form.Item>
        <Form.Item name="summary" label="Tóm tắt">
          <Input.TextArea rows={4} disabled={readOnly} />
        </Form.Item>
        <Can permissions={["course.manage"]}>
          {!readOnly && (
            <Button type="primary" onClick={handleSave} loading={update.isPending}>
              Lưu
            </Button>
          )}
        </Can>
      </Form>
    </div>
  );
}
