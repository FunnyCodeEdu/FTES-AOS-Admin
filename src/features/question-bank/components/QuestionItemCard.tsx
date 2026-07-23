import {
  Alert,
  Button,
  Card,
  Image,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, RedoOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import { useDeleteItem, useResolveItem } from "../api/questionBank.api";
import { STATUS_COLOR, STATUS_LABEL } from "../format";
import type { QuestionItemView } from "../types";

interface QuestionItemCardProps {
  bankId: string;
  item: QuestionItemView;
}

const { Text, Paragraph } = Typography;

/**
 * Thẻ một ảnh đề bài: thumbnail Cloudinary (lazy, trong `Image.PreviewGroup` ở trang cha),
 * status Tag, câu hỏi/lời giải/giải thích khi SOLVED, Spin khi PENDING, ghi chú khi FAILED.
 * Nút "Giải lại"/"Xoá" bọc `<Can>` theo leaf `question.bank.manage`.
 */
export function QuestionItemCard({ bankId, item }: QuestionItemCardProps) {
  const resolveItem = useResolveItem(bankId);
  const deleteItem = useDeleteItem(bankId);

  const handleResolve = () => {
    resolveItem.mutate(
      { itemId: item.id },
      { onSuccess: () => message.success("Đang giải lại ảnh…") }
    );
  };

  const handleDelete = () => {
    deleteItem.mutate(
      { itemId: item.id },
      { onSuccess: () => message.success("Đã xoá ảnh khỏi kho") }
    );
  };

  return (
    <Card
      size="small"
      styles={{ body: { display: "flex", flexDirection: "column", gap: 8 } }}
      cover={
        <div style={{ background: "#00000008", textAlign: "center", padding: 8 }}>
          <Image
            src={item.imageUrl}
            alt="Ảnh đề bài"
            loading="lazy"
            style={{ maxHeight: 180, objectFit: "contain" }}
          />
        </div>
      }
    >
      <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
        <Tag color={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</Tag>
        <Space size={4}>
          {item.status !== "PENDING" && (
            <Can permissions={["question.bank.manage"]}>
              <Button
                size="small"
                icon={<RedoOutlined />}
                loading={resolveItem.isPending}
                onClick={handleResolve}
              >
                Giải lại
              </Button>
            </Can>
          )}
          <Can permissions={["question.bank.manage"]}>
            <Popconfirm
              title="Xoá ảnh này khỏi kho?"
              description="Ảnh và các câu hỏi đã giải sẽ bị xoá vĩnh viễn."
              okText="Xoá"
              okType="danger"
              cancelText="Huỷ"
              onConfirm={handleDelete}
            >
              <Button size="small" danger icon={<DeleteOutlined />} loading={deleteItem.isPending} />
            </Popconfirm>
          </Can>
        </Space>
      </Space>

      {item.status === "PENDING" && (
        <Space>
          <Spin size="small" />
          <Text type="secondary">Đang giải bằng AI…</Text>
        </Space>
      )}

      {item.status === "FAILED" && (
        <Alert
          type="error"
          showIcon
          message="AI chưa giải được ảnh này"
          description={item.rawText || 'Hãy thử "Giải lại".'}
        />
      )}

      {item.status === "SOLVED" && item.questions.length === 0 && (
        <Text type="secondary">Không bóc được câu hỏi nào từ ảnh.</Text>
      )}

      {item.status === "SOLVED" &&
        item.questions.map((q, idx) => (
          <div key={idx} style={{ borderTop: idx > 0 ? "1px solid #f0f0f0" : undefined, paddingTop: idx > 0 ? 8 : 0 }}>
            <Paragraph style={{ marginBottom: 4 }}>
              <Text strong>Câu {idx + 1}. </Text>
              {q.question}
            </Paragraph>
            <Paragraph style={{ marginBottom: 4 }}>
              <Text type="success">Đáp án: </Text>
              {q.answer}
            </Paragraph>
            {q.explanation && (
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                <Text type="secondary">Giải thích: </Text>
                {q.explanation}
              </Paragraph>
            )}
          </div>
        ))}

      {item.model && item.status === "SOLVED" && (
        <Text type="secondary" style={{ fontSize: 11 }}>
          Mô hình: {item.model}
        </Text>
      )}
    </Card>
  );
}
