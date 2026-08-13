import { useEffect, useMemo, useState } from "react";
import { Form, Input, Modal, Select, Space, Typography, message } from "antd";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { SubjectSelect } from "../../components/SubjectSelect";
import { useSubjects } from "../../subjects/api/subjects.api";
import {
  useCreateBankChallenge,
  useSetChallengeTags,
  type CreateBankChallengeResult,
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
   * Gọi khi thử thách đã tạo XONG. `row` là bản dựng tại chỗ vừa đủ để mở tiếp modal đề thi.
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
 * Dọn danh sách tag trước khi gửi: bỏ khoảng trắng thừa, bỏ ô rỗng, khử trùng KHÔNG PHÂN BIỆT HOA
 * THƯỜNG (BE chuẩn hoá về slug, nên "PE" và "pe" là một — gửi cả hai chỉ làm trần 32 tag hụt đi một
 * chỗ vô ích). Giữ nguyên THỨ TỰ và DẠNG GÕ của lần xuất hiện đầu: đó là nhãn admin muốn thấy.
 */
export function normalizeChallengeTags(raw: readonly string[] | undefined | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of raw ?? []) {
    const value = (tag ?? "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/**
 * Có phải gọi bù `PUT /{id}/tags` sau khi tạo không?
 *
 * Hợp đồng MỚI là gửi `tags` ngay trong lượt tạo — nhưng bản BE đang chạy CHƯA đọc field đó
 * (`AdminChallengeController.create` còn nhận `CreateChallengeBody` không có `tags`) và Jackson thì
 * lặng lẽ bỏ qua field lạ. Nếu tin suông rằng server đã gắn tag, mọi đề tạo ra từ giờ tới ngày BE
 * lên sẽ KHÔNG có tag `PE`+mã môn — tức là biến mất khỏi đúng bộ lọc mà kho PE dựa vào, mà không
 * một câu báo lỗi nào.
 *
 * Cách nhận biết: response của lượt tạo có ECHO tag về hay không. Có ⇒ server đã áp, im lặng đi
 * tiếp. Vắng ⇒ bản BE cũ, gọi bù lệnh cũ. `PUT /tags` là replace-set nên gọi bù lần nữa với đúng bộ
 * tag đó vẫn ra cùng kết quả — không có cửa hỏng vì gọi thừa.
 *
 * Ngày BE lên, hàm này tự thôi trả `true` và lệnh thứ hai biến mất, không phải sửa gì.
 */
export function needsTagFollowUp(
  requested: readonly string[],
  created: Pick<CreateBankChallengeResult, "tags"> | null | undefined
): boolean {
  if (requested.length === 0) return false;
  const applied = created?.tags;
  if (!applied) return true;
  const slugs = new Set(applied.map((t) => (t.slug ?? "").trim().toLowerCase()));
  return requested.some((tag) => !slugs.has(tag.trim().toLowerCase()));
}

/**
 * Tạo đề THẲNG VÀO KHO — không phải bước vào khoá nào (khác `ChallengeWizardDrawer`, vốn luôn sống
 * trong ngữ cảnh một khoá/bài).
 *
 * Đi `POST /api/v1/admin/challenges`: BE tự sinh slug, đặt `status = DRAFT`, không đòi course/lesson.
 * Tag đi KÈM trong chính lượt tạo — tạo và gắn tag cùng thành hoặc cùng hỏng, nên không còn cửa để
 * lại một thử thách "đã tạo nhưng chưa có tag". Tag được điền sẵn `PE` + **mã môn** vì đó đúng là
 * cách mô hình mới phân loại đề PE — nhưng vẫn sửa được (không phải đề nào cũng là PE).
 *
 * `needsTagFollowUp` là đường lùi TẠM cho bản BE chưa đọc `tags` (xem chú thích của nó). Nó KHÔNG
 * phải bộ máy khôi phục lỗi cũ: không còn trạng thái "đã tạo, bấm thử lại đi" giữ modal mở, vì
 * nguyên nhân sinh ra nó (hai lệnh do NGƯỜI DÙNG bấm) đã hết.
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

  const handleFinish = (values: CreateFormValues) => {
    const tags = normalizeChallengeTags(values.tags);
    create.mutate(
      {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        difficulty: values.difficulty,
        type: values.type,
        subjectId: values.subjectId,
        tags,
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
            tags: tags.map((slug) => ({ slug, label: slug })),
          };

          const finish = () => {
            message.success(
              tags.length > 0 ? "Đã tạo thử thách và đặt tag" : "Đã tạo thử thách trong kho"
            );
            onCreated?.(row);
            onClose();
          };

          if (!needsTagFollowUp(tags, created)) {
            finish();
            return;
          }

          // Bản BE cũ chưa đọc `tags` trong lượt tạo — gắn bù ngay, KHÔNG hỏi người dùng.
          setTags
            .mutateAsync({ id: created.id, tags })
            .then(finish)
            .catch(() => {
              // Thử thách ĐÃ tồn tại: đóng modal và báo đúng việc còn thiếu. Giữ modal mở kèm nút
              // "thử lại" chỉ dẫn tới bản trùng khi người dùng bấm Tạo lần nữa.
              message.warning(
                "Đã tạo thử thách nhưng chưa gắn được tag — hãy sửa tag cho nó ngay trong kho."
              );
              onCreated?.({ ...row, tags: [] });
              onClose();
            });
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
      okText="Tạo"
      cancelText="Đóng"
      confirmLoading={create.isPending || setTags.isPending}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          Đề nằm trong kho của <strong>môn</strong> và chưa thuộc khoá nào. Khoá học sẽ tự nhặt về
          sau qua mục <strong>Chỗ dùng</strong>.
        </Typography.Text>

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
          Tạo xong sẽ mở tiếp bước tải <strong>bộ đề</strong> (ảnh/PDF để xem + template để tải về).
          Thử thách ở trạng thái <strong>nháp</strong> cho tới khi được duyệt/xuất bản.
        </Typography.Text>
      </Space>
    </Modal>
  );
}
