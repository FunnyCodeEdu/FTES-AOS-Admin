import { useEffect } from "react";
import { Form, Input, Modal, Select, Typography, message } from "antd";
import { SubjectSelect } from "../../components/SubjectSelect";
import { useUpdateBankChallenge } from "../api/challengeBankConsole.api";
import { CHALLENGE_DIFFICULTY_OPTIONS, type BankChallengeRow } from "../types";

interface BankChallengeMetaModalProps {
  open: boolean;
  challenge: BankChallengeRow | null;
  disabled?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface MetaFormValues {
  title: string;
  difficulty?: string;
  subjectId?: string;
}

/**
 * Diff form → PATCH partial: CHỈ đính field ĐỔI (BE partial update, null = giữ nguyên).
 * Export để unit test không cần dựng modal.
 */
export function buildBankMetaPatch(
  original: Pick<BankChallengeRow, "title" | "difficulty" | "subjectId">,
  values: MetaFormValues
): { title?: string; difficulty?: string; subjectId?: string } {
  const patch: { title?: string; difficulty?: string; subjectId?: string } = {};

  const nextTitle = (values.title ?? "").trim();
  if (nextTitle && nextTitle !== original.title) patch.title = nextTitle;

  if (values.difficulty && values.difficulty !== (original.difficulty ?? undefined)) {
    patch.difficulty = values.difficulty;
  }

  if (values.subjectId && values.subjectId !== (original.subjectId ?? undefined)) {
    patch.subjectId = values.subjectId;
  }

  return patch;
}

/**
 * Sửa nhanh META của một dòng kho: tiêu đề, **độ khó**, **môn**.
 *
 * Ba field này là toàn bộ những gì `GET /bank` trả về mà còn sửa được — và độ khó/môn hiện KHÔNG có
 * bất cứ chỗ nào khác trong Admin đặt được (form challenge cũ cố ý bỏ `difficulty` khi cột chưa tồn
 * tại; nay V313 đã có cột thật).
 *
 * KHÔNG có ô mô tả/lịch/số lần nộp ở đây: dòng kho không mang các field đó, dựng ô trống rồi lưu là
 * cách chắc chắn nhất để xoá mất dữ liệu thật của người khác.
 */
export function BankChallengeMetaModal({
  open,
  challenge,
  disabled,
  onClose,
  onSaved,
}: BankChallengeMetaModalProps) {
  const [form] = Form.useForm<MetaFormValues>();
  const update = useUpdateBankChallenge();

  useEffect(() => {
    if (open && challenge) {
      form.setFieldsValue({
        title: challenge.title,
        difficulty: challenge.difficulty ?? undefined,
        subjectId: challenge.subjectId ?? undefined,
      });
    }
  }, [open, challenge, form]);

  const handleFinish = (values: MetaFormValues) => {
    if (!challenge) return;
    const patch = buildBankMetaPatch(challenge, values);
    if (Object.keys(patch).length === 0) {
      message.info("Chưa có thay đổi nào để lưu");
      onClose();
      return;
    }
    update.mutate(
      { id: challenge.id, body: patch },
      {
        onSuccess: () => {
          message.success("Đã cập nhật thử thách");
          onSaved?.();
          onClose();
        },
      }
    );
  };

  return (
    <Modal
      title="Sửa nhanh thử thách"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Huỷ"
      confirmLoading={update.isPending}
      okButtonProps={{ disabled }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} disabled={disabled}>
        <Form.Item
          name="title"
          label="Tiêu đề"
          rules={[{ required: true, whitespace: true, message: "Nhập tiêu đề" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="difficulty" label="Độ khó">
          <Select allowClear options={CHALLENGE_DIFFICULTY_OPTIONS} placeholder="Chưa phân loại" />
        </Form.Item>
        <Form.Item name="subjectId" label="Môn học">
          <SubjectSelect style={{ width: "100%" }} />
        </Form.Item>
      </Form>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Mô tả, lịch mở/đóng, số lần nộp và nội dung bài vẫn sửa trong trang khoá học — kho chỉ giữ
        phần phân loại.
      </Typography.Text>
    </Modal>
  );
}
