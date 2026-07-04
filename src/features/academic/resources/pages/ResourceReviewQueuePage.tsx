import { useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Form, Input, List, Modal, Space, Tag, Typography, message } from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { Resource, ResourceListParams } from "../../types";
import { useApproveResource, useRejectResource, useReviewQueue } from "../api/resources.api";
import { ScopePicker } from "../../components/ScopePicker";

const DEFAULT_PAGE_SIZE = 10;

function parseParams(searchParams: URLSearchParams): ResourceListParams {
  return {
    subjectId: searchParams.get("subjectId") || undefined,
    type: (searchParams.get("type") as ResourceListParams["type"]) || undefined,
    search: searchParams.get("search") || undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10),
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
  };
}

export default function ResourceReviewQueuePage() {
  const [searchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const { data, isLoading, isError, error, refetch } = useReviewQueue(params);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [note, setNote] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectForm] = Form.useForm<{ reason: string }>();
  const rejectReasonValue = Form.useWatch("reason", rejectForm);
  const approve = useApproveResource();
  const reject = useRejectResource();

  const handleApprove = () => {
    if (!selected) return;
    Modal.confirm({
      title: "Duyệt học liệu",
      content: (
        <>
          Duyệt <strong>{selected.title}</strong>? Học liệu sẽ hiển thị với học viên theo visibility đã chọn.
          Quyết định được ghi audit.
        </>
      ),
      okText: "Duyệt",
      onOk: () => {
        approve.mutate(
          { resourceId: selected.id, note },
          {
            onSuccess: () => {
              message.success("Đã duyệt học liệu");
              setSelected(null);
              setNote("");
            },
            onError: (err: Error) => message.error(err.message || "Duyệt thất bại"),
          }
        );
      },
    });
  };

  const handleRejectOpen = () => {
    if (!selected) return;
    rejectForm.resetFields();
    setRejectOpen(true);
  };

  const handleRejectOk = () => {
    if (!selected) return;
    rejectForm.validateFields().then(({ reason }) => {
      reject.mutate(
        { resourceId: selected.id, reason },
        {
          onSuccess: () => {
            message.success("Đã từ chối học liệu");
            rejectForm.resetFields();
            setRejectOpen(false);
            setSelected(null);
            setNote("");
          },
          onError: (err: Error) => message.error(err.message || "Từ chối thất bại"),
        }
      );
    });
  };

  return (
    <div>
      <Typography.Title level={3}>Hàng đợi duyệt học liệu</Typography.Title>
      <ScopePicker />
      {isError && (
        <Alert
          type="error"
          message="Không thể tải hàng đợi"
          description={error?.message}
          action={
            <Button icon={<ReloadOutlined />} size="small" onClick={() => refetch()}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Space align="start" style={{ width: "100%" }} size="large">
        <Card style={{ width: 420, minHeight: 400 }} loading={isLoading && !data}>
          {data && data.items.length === 0 ? (
            <Empty description="Không còn học liệu chờ duyệt" />
          ) : (
            <List
              dataSource={data?.items ?? []}
              renderItem={(item) => (
                <List.Item
                  style={{
                    cursor: "pointer",
                    background: selected?.id === item.id ? "#f0f5ff" : undefined,
                  }}
                  onClick={() => {
                    setSelected(item);
                    setNote("");
                    rejectForm.resetFields();
                    setRejectOpen(false);
                  }}
                >
                  <List.Item.Meta
                    title={item.title}
                    description={
                      <Space>
                        <Tag color="orange">pending</Tag>
                        <span>{item.subjectName}</span>
                        <span>{item.type}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
        <Card style={{ flex: 1, minHeight: 400 }} title="Preview &amp; quyết định">
          {selected ? (
            <>
              <Typography.Title level={4}>{selected.title}</Typography.Title>
              <Space style={{ marginBottom: 16 }}>
                <Tag color="orange">pending</Tag>
                <span>{selected.subjectName}</span>
                <span>{selected.type}</span>
              </Space>
              <Typography.Paragraph>
                <strong>License:</strong> {selected.license || "—"}
              </Typography.Paragraph>
              <Typography.Paragraph>
                <strong>Visibility:</strong> {selected.visibility}
              </Typography.Paragraph>
              <Input.TextArea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Ghi chú khi duyệt (tuỳ chọn)"
                style={{ marginBottom: 16 }}
              />
              <Space>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleApprove}
                  loading={approve.isPending}
                >
                  Duyệt
                </Button>
                <Button danger icon={<CloseOutlined />} onClick={handleRejectOpen} loading={reject.isPending}>
                  Từ chối
                </Button>
              </Space>
            </>
          ) : (
            <Empty description="Chọn một học liệu để xem và quyết định" />
          )}
        </Card>
      </Space>

      <Modal
        title="Từ chối học liệu"
        open={rejectOpen && !!selected}
        onCancel={() => {
          setRejectOpen(false);
          rejectForm.resetFields();
        }}
        onOk={handleRejectOk}
        confirmLoading={reject.isPending}
        okText="Từ chối"
        okButtonProps={{ danger: true, disabled: !rejectReasonValue?.trim() }}
      >
        <Typography.Paragraph type="danger">
          Từ chối <strong>{selected?.title}</strong>. Lý do bắt buộc để CTV biết và sửa lại.
        </Typography.Paragraph>
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[
              { required: true, message: "Vui lòng nhập lý do" },
              { min: 5, message: "Lý do phải có ít nhất 5 ký tự" },
            ]}
          >
            <Input.TextArea rows={3} autoFocus placeholder="Nhập lý do từ chối" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
