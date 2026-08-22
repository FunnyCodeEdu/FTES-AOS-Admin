import { useEffect } from "react";
import { Button, Modal } from "antd";
import type { Course } from "../../types";
import { useBulkEnrollPanel } from "./bulkEnroll";

interface GrantEnrollmentModalProps {
  open: boolean;
  course: Course | null;
  onClose: () => void;
}

/**
 * Cấp học viên vào một course — HÀNG LOẠT theo username (dán danh sách cách nhau dấu phẩy).
 * Dùng chung cụm `useBulkEnrollPanel` với tab Học viên nên hai chỗ hành xử y hệt: BE cấp từng
 * username rồi trả {added, notFound, failed}, hỏng một cái KHÔNG làm hỏng cả danh sách — thành công
 * hết thì báo thành công và đóng modal, còn lại chỉ nêu đúng username không cấp được.
 * BE gác `admin.course.manage`; nút mở modal gate bằng `course.update` (xem CourseTable).
 */
export function GrantEnrollmentModal({ open, course, onClose }: GrantEnrollmentModalProps) {
  const panel = useBulkEnrollPanel(course?.id);
  const { reset } = panel;

  useEffect(() => {
    if (open) reset();
    // reset lấy từ hook (identity đổi mỗi render) — chỉ cần chạy khi mở lại modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      open={open}
      title={course ? `Cấp học viên · ${course.name}` : "Cấp học viên"}
      onCancel={onClose}
      destroyOnClose
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={panel.isPending}
          disabled={panel.count === 0}
          onClick={() => panel.submit(onClose)}
        >
          Cấp {panel.count > 0 ? `${panel.count} học viên` : "học viên"}
        </Button>,
      ]}
    >
      {panel.node}
    </Modal>
  );
}
