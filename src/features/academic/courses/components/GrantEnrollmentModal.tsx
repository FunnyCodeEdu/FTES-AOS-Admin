import { useEffect, useState } from "react";
import { Form, Modal, Select, message } from "antd";
import type { Course } from "../../types";
import { useUsers } from "../../../users/api/users.api";
import { useGrantCourseEnrollment } from "../api/courses.api";

interface GrantEnrollmentModalProps {
  open: boolean;
  course: Course | null;
  onClose: () => void;
}

/**
 * Cấp quyền học viên vào một course. Chọn học viên bằng Select tìm kiếm (adminUsers),
 * gửi userId tới `POST /api/v1/admin/courses/{id}/enrollments`. BE enforce
 * `admin.course.manage`; ở đây gate nút bằng `course.update` (xem CourseTable).
 */
export function GrantEnrollmentModal({ open, course, onClose }: GrantEnrollmentModalProps) {
  const [form] = Form.useForm<{ userId: string }>();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const grant = useGrantCourseEnrollment(course?.id);
  const { data: users, isFetching } = useUsers({
    search: search || undefined,
    page: 1,
    pageSize: 20,
  });

  // debounce ô tìm kiếm 300ms
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  // reset khi mở lại
  useEffect(() => {
    if (open) {
      form.resetFields();
      setInput("");
      setSearch("");
    }
  }, [open, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      grant.mutate(values, {
        onSuccess: () => {
          message.success("Đã cấp quyền học viên vào khoá học");
          onClose();
        },
        onError: (err: Error) => message.error(err.message || "Cấp quyền thất bại"),
      });
    });
  };

  const options = (users?.items ?? []).map((user) => ({
    label: user.email ? `${user.fullName} · ${user.email}` : user.fullName,
    value: user.id,
  }));

  return (
    <Modal
      open={open}
      title={course ? `Cấp học viên · ${course.name}` : "Cấp học viên"}
      onOk={handleOk}
      onCancel={onClose}
      okText="Cấp quyền"
      confirmLoading={grant.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="userId"
          label="Học viên"
          rules={[{ required: true, message: "Chọn học viên" }]}
        >
          <Select
            showSearch
            filterOption={false}
            onSearch={setInput}
            loading={isFetching}
            placeholder="Tìm theo tên / email"
            options={options}
            notFoundContent={isFetching ? "Đang tìm..." : "Không có kết quả"}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
