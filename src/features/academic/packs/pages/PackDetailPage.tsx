import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, InputNumber, Modal, Skeleton, Table, Typography, message } from "antd";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import type { PackItem } from "../../types";
import { usePack, useUpdatePackItems } from "../api/packs.api";

export default function PackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: pack, isLoading, isError, error, refetch } = usePack(id);
  const updateItems = useUpdatePackItems(id);
  const [items, setItems] = useState<PackItem[]>([]);

  useEffect(() => {
    if (pack) setItems(pack.items ?? []);
  }, [pack]);

  const handleSave = () => {
    updateItems.mutate(
      { items: items.map((item, idx) => ({ ...item, order: idx + 1 })) },
      {
        onSuccess: () => message.success("Đã lưu thứ tự pack"),
        onError: (err: Error) => message.error(err.message || "Lưu thất bại"),
      }
    );
  };

  const handleRemove = (item: PackItem) => {
    Modal.confirm({
      title: "Gỡ item",
      content: `Gỡ ${item.title} khỏi pack?`,
      okText: "Gỡ",
      okType: "danger",
      onOk: () => setItems((prev) => prev.filter((i) => !(i.refId === item.refId && i.type === item.type))),
    });
  };

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (isError || !pack) {
    return (
      <Alert
        type="error"
        message="Không thể tải pack"
        description={error?.message}
        action={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Typography.Title level={3}>{pack.name}</Typography.Title>
      <Card>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Mô tả">{pack.description || "—"}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{pack.status}</Descriptions.Item>
          <Descriptions.Item label="Số item">{pack.itemCount}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Thành phần" style={{ marginTop: 16 }}>
        <Can permissions={["package.manage"]}>
          <Button icon={<SaveOutlined />} type="primary" onClick={handleSave} loading={updateItems.isPending}>
            Lưu thứ tự
          </Button>
        </Can>
        <Table
          rowKey={(r) => `${r.type}-${r.refId}`}
          dataSource={items}
          pagination={false}
          style={{ marginTop: 16 }}
          columns={[
            { title: "Loại", dataIndex: "type" },
            { title: "Tên", dataIndex: "title" },
            {
              title: "Thứ tự",
              dataIndex: "order",
              render: (_: unknown, record: PackItem, idx: number) => (
                <Can permissions={["package.manage"]} fallback={<span>{record.order}</span>}>
                  <InputNumber
                    min={1}
                    value={record.order}
                    onChange={(value) => {
                      setItems((prev) => {
                        const next = [...prev];
                        next[idx].order = value ?? idx + 1;
                        return next.sort((a, b) => a.order - b.order);
                      });
                    }}
                    style={{ width: 80 }}
                  />
                </Can>
              ),
            },
            {
              title: "Thao tác",
              render: (_: unknown, record: PackItem) => (
                <Can permissions={["package.manage"]}>
                  <Button danger size="small" onClick={() => handleRemove(record)}>
                    Gỡ
                  </Button>
                </Can>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
