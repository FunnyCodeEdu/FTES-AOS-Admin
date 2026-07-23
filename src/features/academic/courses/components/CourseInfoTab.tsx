import { useEffect } from "react";
import { Button, Form, Input, Modal, Select, Typography, message } from "antd";
import type { CourseDetail, CourseFormValues, CourseType } from "../../types";
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
      saleMode: course.saleMode,
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

  /**
   * LEGACY → PACKAGE là thao tác MỘT CHIỀU (BE cấm hạ về LEGACY) nên phải xác nhận ngay lúc chọn,
   * trước khi có cơ hội bấm Lưu. Huỷ thì trả select về LEGACY và không gửi request nào.
   */
  const handleSaleModeChange = (value: CourseType) => {
    if (course.saleMode !== "LEGACY" || value !== "PACKAGE") return;
    Modal.confirm({
      title: "Chuyển khoá học sang bán theo gói?",
      content:
        "Thao tác này KHÔNG hoàn tác được — hệ thống không cho hạ khoá về LEGACY. Khoá sẽ chuyển sang bán theo gói, hệ thống tự tạo gói \"Trọn khoá\" và học viên đang học vẫn giữ nguyên quyền học.",
      okText: "Chuyển sang PACKAGE",
      cancelText: "Huỷ",
      onCancel: () => form.setFieldValue("saleMode", "LEGACY"),
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
        <Form.Item name="saleMode" label="Loại khoá học">
          <Select
            disabled={readOnly}
            placeholder="Chọn loại khoá học"
            onChange={handleSaleModeChange}
            options={[
              { value: "LEGACY", label: "LEGACY", disabled: course.saleMode === "PACKAGE" },
              { value: "PACKAGE", label: "PACKAGE" },
            ]}
          />
        </Form.Item>
        {/* Save hiển thị theo prop readOnly (owner-authz), KHÔNG gate <Can course.manage> — owner
            thuần (instructor_id) không có quyền GLOBAL/scoped nhưng vẫn được sửa khoá của mình. */}
        {!readOnly && (
          <Button type="primary" onClick={handleSave} loading={update.isPending}>
            Lưu
          </Button>
        )}
      </Form>
    </div>
  );
}
