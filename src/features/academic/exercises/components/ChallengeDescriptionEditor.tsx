import { MarkdownEditor } from "../../../../shared/components/MarkdownEditor";
import { useUploadChallengeMedia } from "../api/exercises.api";

interface ChallengeDescriptionEditorProps {
  /** antd Form truyền vào khi dùng trong <Form.Item>. */
  value?: string;
  onChange?: (value: string) => void;
  height?: number;
}

/**
 * Ô MÔ TẢ ĐỀ BÀI: editor markdown (xem trước + chèn ảnh) thay cho textarea 2 dòng.
 *
 * <p>Đề bài thường dài (nhiều dòng input/output, ví dụ) nên ô 2 dòng không đọc lại được để soát đề;
 * và ảnh minh hoạ phải chèn được ngay trong đề. Mô tả lưu dạng MARKDOWN — trang giải bài của học viên
 * đã render markdown (`ChallengeView` truyền `markdown={challenge.description}`) nên định dạng + ảnh
 * hiện đúng, không phải đổi gì bên đó.
 */
export function ChallengeDescriptionEditor({
  value,
  onChange,
  height = 380,
}: ChallengeDescriptionEditorProps) {
  const upload = useUploadChallengeMedia();
  return (
    <MarkdownEditor
      value={value}
      onChange={onChange}
      height={height}
      uploading={upload.isPending}
      uploadImage={async (file) => (await upload.mutateAsync(file)).secureUrl}
    />
  );
}
