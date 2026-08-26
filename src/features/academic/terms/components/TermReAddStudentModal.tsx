import { useEffect, useState } from "react";
import { Form, Modal, Select, message } from "antd";
import { useUsers } from "../../../users/api/users.api";
import { useGrantCourseEnrollment } from "../../courses/api/courses.api";
import { useCoursePackagePicker } from "../../courses/components/coursePackagePicker";

interface TermReAddStudentModalProps {
  open: boolean;
  /** Khoá cần cấp lại học viên (từ tab Ảnh hưởng). */
  course: { courseId: string; title: string } | null;
  onClose: () => void;
}

/**
 * Cấp lại (re-enroll) một học viên vào một khoá của kỳ — dùng lại hook có sẵn
 * `useGrantCourseEnrollment` (POST /api/v1/admin/courses/{courseId}/enrollments {userId, packageId?}).
 * Chọn học viên bằng Select tìm kiếm (adminUsers, debounce 300ms). Gate nút mở ở tab bằng `term.manage`.
 *
 * Khoá bán theo gói phải chọn gói: cấp lại mà không kèm gói thì học viên có tên trong danh bạ nhưng
 * chỉ xem được bài học thử. Bảng "Ảnh hưởng" của kỳ không mang `saleMode`, nên cụm chọn gói tự suy ra
 * từ chính danh sách gói của khoá (khoá LEGACY không có gói → ô chọn không hiện).
 */
export function TermReAddStudentModal({ open, course, onClose }: TermReAddStudentModalProps) {
  const [form] = Form.useForm<{ userId: string }>();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const grant = useGrantCourseEnrollment(course?.courseId);
  const picker = useCoursePackagePicker(course?.courseId);
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
      picker.reset();
    }
    // picker.reset lấy từ hook (identity đổi mỗi render) — chỉ cần chạy khi mở lại modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  const handleOk = () => {
    if (picker.blocked) {
      message.info("Khoá này bán theo gói — chọn gói trước khi cấp lại");
      return;
    }
    form.validateFields().then((values) => {
      grant.mutate({ userId: values.userId, packageId: picker.packageId }, {
        onSuccess: () => {
          message.success("Đã cấp lại học viên vào khoá học");
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
      title={course ? `Cấp lại học viên · ${course.title}` : "Cấp lại học viên"}
      onOk={handleOk}
      onCancel={onClose}
      okText="Cấp quyền"
      cancelText="Huỷ"
      confirmLoading={grant.isPending}
      okButtonProps={{ disabled: picker.blocked }}
      destroyOnClose
    >
      {picker.node}
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
