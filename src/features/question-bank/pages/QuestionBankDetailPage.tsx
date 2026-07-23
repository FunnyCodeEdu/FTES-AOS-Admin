import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Image,
  Modal,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import { Can } from "../../../shared/permissions";
import { useDeleteBank, useQuestionBankDetail } from "../api/questionBank.api";
import { QUESTION_ITEM_STALE_MS, formatDate, pendingCount } from "../format";
import { BankImageDropzone } from "../components/BankImageDropzone";
import { QuestionItemCard } from "../components/QuestionItemCard";

export default function QuestionBankDetailPage() {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuestionBankDetail(bankId);
  const deleteBank = useDeleteBank();

  const items = data?.items ?? [];
  const pending = pendingCount(items);
  const hasPending = pending > 0;

  // Đồng hồ stale: sau ~90s vẫn còn item PENDING thì đổi copy — KHÔNG dừng poll (poll do
  // `useQuestionBankDetail` tự dừng khi hết PENDING). Reset khi hết PENDING.
  const [isStale, setIsStale] = useState(false);
  useEffect(() => {
    if (!hasPending) {
      setIsStale(false);
      return;
    }
    const timer = setTimeout(() => setIsStale(true), QUESTION_ITEM_STALE_MS);
    return () => clearTimeout(timer);
  }, [hasPending]);

  if (!bankId) return null;

  const bank = data?.bank;

  const confirmDelete = () => {
    Modal.confirm({
      title: "Xoá kho câu hỏi?",
      content: (
        <>
          Kho <strong>{bank?.title}</strong> cùng toàn bộ ảnh và câu hỏi đã giải sẽ bị xoá vĩnh
          viễn. Thao tác không thể hoàn tác.
        </>
      ),
      okText: "Xoá kho",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          deleteBank.mutate(
            { bankId },
            {
              onSuccess: () => {
                message.success("Đã xoá kho câu hỏi");
                resolve();
                navigate("/question-banks");
              },
              onError: () => reject(),
            }
          );
        }),
    });
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/question-banks")}>
          Danh sách kho
        </Button>
      </Space>

      {isError && (
        <Alert
          type="error"
          style={{ marginBottom: 16 }}
          message="Không thể tải kho câu hỏi"
          description={error?.message}
          action={
            <Button size="small" onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      {isLoading && !data ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : bank ? (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: "100%" }} size={4}>
              <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                <Space align="center" wrap>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    {bank.title}
                  </Typography.Title>
                  {bank.status && <Tag>{bank.status}</Tag>}
                </Space>
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    loading={isFetching}
                    onClick={() => refetch()}
                  >
                    Làm mới
                  </Button>
                  <Can permissions={["question.bank.manage"]}>
                    <Button danger icon={<DeleteOutlined />} onClick={confirmDelete}>
                      Xoá kho
                    </Button>
                  </Can>
                </Space>
              </Space>
              {bank.description && (
                <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                  {bank.description}
                </Typography.Paragraph>
              )}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {bank.itemCount} ảnh · Tạo ngày {formatDate(bank.createdAt)}
              </Typography.Text>
            </Space>
          </Card>

          <Can permissions={["question.bank.manage"]}>
            <Card title="Tải ảnh đề bài" style={{ marginBottom: 16 }}>
              <BankImageDropzone bankId={bankId} />
            </Card>
          </Can>

          {hasPending && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={
                isStale
                  ? `Vẫn đang xử lý ${pending} ảnh — quá trình giải mất lâu hơn dự kiến, vui lòng chờ thêm.`
                  : `Đang xử lý ${pending} ảnh… kết quả sẽ tự cập nhật.`
              }
            />
          )}

          {items.length === 0 ? (
            <Empty description="Chưa có ảnh nào trong kho. Kéo-thả thư mục ảnh ở trên để bắt đầu." />
          ) : (
            <Image.PreviewGroup>
              <Row gutter={[16, 16]}>
                {items.map((item) => (
                  <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
                    <QuestionItemCard bankId={bankId} item={item} />
                  </Col>
                ))}
              </Row>
            </Image.PreviewGroup>
          )}
        </>
      ) : (
        !isError && <Empty description="Không tìm thấy kho câu hỏi" />
      )}
    </div>
  );
}
