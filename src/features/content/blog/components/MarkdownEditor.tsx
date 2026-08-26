import { MarkdownEditor as SharedMarkdownEditor } from "../../../../shared/components/MarkdownEditor";
import { useUploadBlogMedia } from "../api/blog.api";

interface BlogMarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  height?: number;
}

/**
 * Editor markdown của BLOG = editor dùng chung + endpoint ảnh của blog (`POST /blog/media`,
 * gác `blog.manage`). Giữ tên/đường import cũ để các trang blog không phải đổi.
 */
export function MarkdownEditor({ value, onChange, height = 460 }: BlogMarkdownEditorProps) {
  const upload = useUploadBlogMedia();
  return (
    <SharedMarkdownEditor
      value={value}
      onChange={onChange}
      height={height}
      uploading={upload.isPending}
      uploadImage={async (file) => (await upload.mutateAsync(file)).secureUrl}
    />
  );
}
