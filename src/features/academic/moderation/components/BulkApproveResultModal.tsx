import { List, Modal, Result, Typography } from "antd";
import type { BulkApproveResult } from "../../types";

interface BulkApproveResultModalProps {
  result: BulkApproveResult | null;
  onClose: () => void;
}

/**
 * Kết quả duyệt hàng loạt.
 *
 * Lý do màn này tồn tại: duyệt N mục là N request độc lập, và một phần hỏng là chuyện bình thường
 * (người khác vừa xử xong mục đó, hoặc mục nằm ngoài phạm vi duyệt của mình). Nếu chỉ hiện
 * "Đã duyệt xong" thì thành công MỘT PHẦN trông y hệt thành công TOÀN BỘ — người duyệt đóng tab và
 * tin là đã dọn sạch. Vì vậy khi có bất kỳ mục nào hỏng, modal chuyển sang `warning`, nói rõ
 * X/N, và liệt kê ĐÍCH DANH từng mục hỏng kèm lý do của chính nó.
 */
export function BulkApproveResultModal({ result, onClose }: BulkApproveResultModalProps) {
  if (!result) return null;

  const total = result.succeeded.length + result.failed.length;
  const hasFailure = result.failed.length > 0;

  return (
    <Modal
      open
      onCancel={onClose}
      onOk={onClose}
      okText="Đóng"
      cancelButtonProps={{ style: { display: "none" } }}
      width={640}
      title="Kết quả duyệt hàng loạt"
    >
      <Result
        status={hasFailure ? "warning" : "success"}
        title={
          hasFailure
            ? `Đã duyệt ${result.succeeded.length}/${total} mục`
            : `Đã duyệt ${total} mục`
        }
        subTitle={
          hasFailure
            ? "Những mục dưới đây KHÔNG được duyệt. Hãy làm mới hàng đợi rồi xử lại từng mục."
            : "Hàng đợi đã được làm mới."
        }
        style={{ paddingTop: 8, paddingBottom: hasFailure ? 0 : 8 }}
      />
      {hasFailure && (
        <List
          size="small"
          bordered
          dataSource={result.failed}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={<Typography.Text strong>{item.title}</Typography.Text>}
                description={<Typography.Text type="danger">{item.message}</Typography.Text>}
              />
            </List.Item>
          )}
          style={{ maxHeight: 280, overflowY: "auto" }}
        />
      )}
    </Modal>
  );
}
