import { useEffect, useState } from "react";
import { Alert, Modal, Skeleton, Space, Typography, message } from "antd";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { useChallengeTags, useSetChallengeTags } from "../api/challengeBankConsole.api";
import { ChallengeTagPicker } from "./ChallengeTagPicker";

interface ChallengeTagsModalProps {
  open: boolean;
  challengeId: string | undefined;
  challengeTitle?: string;
  disabled?: boolean;
  onClose: () => void;
  /** Gọi sau khi lưu thành công (caller refetch danh sách để chip tag của dòng cập nhật). */
  onSaved?: (tags: string[]) => void;
}

/**
 * Sửa tag của MỘT thử thách (`PUT /admin/challenges/{id}/tags`, replace-set).
 *
 * Điểm phải cẩn thận: PUT là ĐẶT LẠI toàn bộ. Nếu `GET /{id}/tags` lỗi mà ta vẫn cho lưu, người dùng
 * sẽ bấm Lưu trên một ô rỗng và **xoá sạch tag đang có** trong khi tưởng mình không đổi gì. Vì thế
 * nút Lưu bị khoá tới khi đọc được tập tag hiện tại.
 */
export function ChallengeTagsModal({
  open,
  challengeId,
  challengeTitle,
  disabled,
  onClose,
  onSaved,
}: ChallengeTagsModalProps) {
  const query = useChallengeTags(challengeId, open);
  const setTags = useSetChallengeTags();
  const [value, setValue] = useState<string[]>([]);

  // Nạp lại mỗi lần mở / mỗi lần server trả tập tag mới.
  useEffect(() => {
    if (open && query.data) {
      setValue(query.data.map((t) => t.slug));
    }
  }, [open, query.data]);

  const handleOk = () => {
    if (!challengeId) return;
    setTags.mutate(
      { id: challengeId, tags: value },
      {
        onSuccess: (saved) => {
          message.success("Đã cập nhật tag");
          onSaved?.(saved.map((t) => t.slug));
          onClose();
        },
      }
    );
  };

  return (
    <Modal
      title="Tag của thử thách"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Lưu tag"
      cancelText="Huỷ"
      confirmLoading={setTags.isPending}
      okButtonProps={{ disabled: disabled || query.isLoading || query.isError }}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {challengeTitle && (
          <Typography.Text>
            Thử thách: <strong>{challengeTitle}</strong>
          </Typography.Text>
        )}

        {query.isError && (
          <Alert
            type="error"
            showIcon
            message="Không đọc được tag hiện tại"
            description={`${adminErrorMessage(query.error)} — chưa thể lưu, vì lưu là ĐẶT LẠI toàn bộ tag và sẽ xoá mất tag đang có.`}
          />
        )}

        {query.isLoading ? (
          <Skeleton active paragraph={{ rows: 1 }} />
        ) : (
          <ChallengeTagPicker
            value={value}
            onChange={setValue}
            disabled={disabled || query.isError}
            style={{ width: "100%" }}
          />
        )}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Danh sách này là <strong>trạng thái cuối cùng</strong>: tag bị bỏ ra sẽ được gỡ khỏi thử
          thách. Đề PE quy ước gắn <code>PE</code> kèm <strong>mã môn</strong> (vd{" "}
          <code>MAE101</code>) — bộ lọc của kho khớp theo GIAO nên hai tag này lọc ra đúng đề PE của
          môn đó.
        </Typography.Text>
      </Space>
    </Modal>
  );
}
