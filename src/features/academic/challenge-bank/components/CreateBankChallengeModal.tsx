import { useEffect, useMemo, useState } from "react";
import { Alert, Form, Input, Modal, Select, Space, Typography, message } from "antd";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { SubjectSelect } from "../../components/SubjectSelect";
import { useSubjects } from "../../subjects/api/subjects.api";
import {
  useCreateBankChallenge,
  useSetChallengeTags,
} from "../api/challengeBankConsole.api";
import {
  CHALLENGE_DIFFICULTY_OPTIONS,
  CHALLENGE_TYPE_OPTIONS,
  PE_TAG,
  type BankChallengeRow,
} from "../types";
import { ChallengeTagPicker } from "./ChallengeTagPicker";

interface CreateBankChallengeModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Gọi khi thử thách đã tạo XONG (kể cả khi đặt tag lỗi — caller vẫn cần biết nó tồn tại để refetch
   * kho). `row` là bản dựng tại chỗ vừa đủ để mở tiếp modal đề thi.
   */
  onCreated?: (row: BankChallengeRow) => void;
}

interface CreateFormValues {
  title: string;
  description?: string;
  subjectId: string;
  difficulty: string;
  type: string;
  tags: string[];
}

/**
 * Tạo đề THẲNG VÀO KHO — không phải bước vào khoá nào (khác `ChallengeWizardDrawer`, vốn luôn sống
 * trong ngữ cảnh một khoá/bài).
 *
 * Đi `POST /api/v1/admin/challenges`: BE tự sinh slug, đặt `status = DRAFT`, không đòi
 * course/lesson. Sau đó đặt tag bằng `PUT /{id}/tags`. Tag được điền sẵn `PE` + **mã môn** vì đó
 * đúng là cách mô hình mới phân loại đề PE — nhưng vẫn sửa được (không phải đề nào cũng là PE).
 *
 * Hai lệnh, nên phải nói thật khi chỉ một lệnh thành công: tạo xong mà đặt tag hỏng thì thử thách
 * ĐÃ tồn tại — báo "đã tạo, chưa gắn tag" và cho thử lại đúng bước tag, KHÔNG báo thất bại toàn bộ
 * (người dùng sẽ tạo lại và đẻ ra bản trùng).
 */
export function CreateBankChallengeModal({
  open,
  onClose,
  onCreated,
}: CreateBankChallengeModalProps) {
  const [form] = Form.useForm<CreateFormValues>();
  const create = useCreateBankChallenge();
  const setTags = useSetChallengeTags();
  const subjects = useSubjects({ page: 1, pageSize: 1000 });

  /** Thử thách đã tạo nhưng CHƯA đặt được tag — giữ lại để thử lại đúng bước còn thiếu. */
  const [pendingTagsFor, setPendingTagsFor] = useState<BankChallengeRow | null>(null);
  const [tagsTouched, setTagsTouched] = useState(false);

  const subjectCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subjects.data?.items ?? []) map.set(s.id, s.code);
    return map;
  }, [subjects.data]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ difficulty: "MEDIUM", type: "CODE", tags: [PE_TAG] });
      setPendingTagsFor(null);
      setTagsTouched(false);
    }
  }, [open, form]);

  /**
   * Đổi môn ⇒ điền lại `PE` + mã môn, TRỪ KHI người dùng đã tự sửa ô tag.
   *
   * Phải bắt qua `onValuesChange` của Form chứ KHÔNG phải prop `onChange` của từng control:
   * `Form.Item` clone child và **ghi đè** `onChange` bằng handler của nó, nên handler ta tự truyền
   * vào `SubjectSelect`/`ChallengeTagPicker` sẽ không bao giờ chạy.
   */
  const handleValuesChange = (changed: Partial<CreateFormValues>) => {
    if ("tags" in changed) {
      setTagsTouched(true);
      return;
    }
    if ("subjectId" in changed) {
      if (tagsTouched) return;
      const code = changed.subjectId ? subjectCodeById.get(changed.subjectId) : undefined;
      form.setFieldValue("tags", code ? [PE_TAG, code] : [PE_TAG]);
    }
  };

  const saveTags = (row: BankChallengeRow, tags: string[]) =>
    setTags
      .mutateAsync({ id: row.id, tags })
      .then(() => {
        setPendingTagsFor(null);
        message.success("Đã tạo thử thách và đặt tag");
        onCreated?.({ ...row, tags: tags.map((slug) => ({ slug, label: slug })) });
        onClose();
      })
      .catch(() => {
        // Lỗi đã hiện qua notification của hook; giữ modal mở với trạng thái "đã tạo, thiếu tag".
        setPendingTagsFor(row);
      });

  const handleFinish = (values: CreateFormValues) => {
    // Bước tag đã hỏng ở lần trước: chỉ chạy lại đúng bước đó, KHÔNG tạo thêm thử thách nữa.
    if (pendingTagsFor) {
      void saveTags(pendingTagsFor, values.tags ?? []);
      return;
    }

    create.mutate(
      {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        difficulty: values.difficulty,
        type: values.type,
        subjectId: values.subjectId,
      },
      {
        onSuccess: (created) => {
          const row: BankChallengeRow = {
            id: created.id,
            title: values.title.trim(),
            slug: "",
            type: values.type,
            status: "DRAFT",
            difficulty: values.difficulty,
            subjectId: values.subjectId,
          };
          const tags = (values.tags ?? []).filter(Boolean);
          if (tags.length === 0) {
            message.success("Đã tạo thử thách trong kho");
            onCreated?.(row);
            onClose();
            return;
          }
          void saveTags(row, tags);
        },
        onError: (error) => {
          message.error(adminErrorMessage(error));
        },
      }
    );
  };

  return (
    <Modal
      title="Tạo đề vào kho"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={pendingTagsFor ? "Thử đặt tag lại" : "Tạo"}
      cancelText="Đóng"
      confirmLoading={create.isPending || setTags.isPending}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          Đề nằm trong kho của <strong>môn</strong> và chưa thuộc khoá nào. Khoá học sẽ tự nhặt về
          sau qua mục <strong>Chỗ dùng</strong>.
        </Typography.Text>

        {pendingTagsFor && (
          <Alert
            type="warning"
            showIcon
            message="Đã tạo thử thách, nhưng chưa đặt được tag"
            description={
              <>
                Thử thách <strong>{pendingTagsFor.title}</strong> đã nằm trong kho ở trạng thái nháp.
                Bấm <strong>Thử đặt tag lại</strong> để hoàn tất — đừng tạo lại, sẽ thành hai bản
                trùng.
              </>
            }
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={handleValuesChange}
        >
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, whitespace: true, message: "Nhập tiêu đề đề thi" }]}
          >
            <Input placeholder="Vd: PE MAE101 — Đề thi thực hành số 3" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Ghi chú cho người soạn/duyệt (không bắt buộc)" />
          </Form.Item>

          <Form.Item
            name="subjectId"
            label="Môn học"
            rules={[{ required: true, message: "Chọn môn — kho thử thách thuộc về môn" }]}
          >
            <SubjectSelect allowClear={false} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="difficulty"
            label="Độ khó"
            rules={[{ required: true, message: "Chọn độ khó" }]}
          >
            <Select options={CHALLENGE_DIFFICULTY_OPTIONS} />
          </Form.Item>

          <Form.Item name="type" label="Loại bài">
            <Select options={CHALLENGE_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tag"
            tooltip="Quy ước đề PE: tag PE + mã môn. Bộ lọc kho khớp theo GIAO nên hai tag này lọc ra đúng đề PE của môn."
          >
            <ChallengeTagPicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Tạo xong sẽ mở tiếp bước tải <strong>tệp đề</strong> (PDF/ảnh). Thử thách ở trạng thái
          <strong> nháp</strong> cho tới khi được duyệt/xuất bản.
        </Typography.Text>
      </Space>
    </Modal>
  );
}
