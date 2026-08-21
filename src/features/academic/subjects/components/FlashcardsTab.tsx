import { useMemo, useState } from "react";
import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";

import { Can } from "../../../../shared/permissions";
import type { SubjectDetail } from "../../types";
import {
  useAddFlashcardCards,
  useCreateFlashcardDeck,
  useDeleteFlashcardCard,
  useDeleteFlashcardDeck,
  useSubjectFlashcards,
  useUpdateFlashcardDeck,
  type AdminFlashcardCard,
  type AdminFlashcardDeck,
} from "../api/flashcards.api";

interface FlashcardsTabProps {
  subject: SubjectDetail;
}

interface DeckFormValues {
  title: string;
  description?: string;
  status: string;
  accessTier: string;
  previewLimit: number;
}

/** Ảnh Markdown `![](url)` — mặt thẻ của môn ra đề bằng hình chỉ chứa đúng thứ này. */
const MD_IMAGE = /^!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)$/

/**
 * Xem trước một mặt thẻ trong bảng: ảnh thì hiện ẢNH, chữ thì hiện chữ.
 *
 * Bảng cũ đổ thẳng chuỗi ra ô nên thẻ ảnh chỉ hiện `![](https://…)` — người vận hành không có
 * cách nào biết mình vừa nạp đúng hình hay nhầm hình.
 */
function CardFace({ value }: { value: string }) {
  const hit = MD_IMAGE.exec((value ?? "").trim())
  if (!hit) return <span>{value}</span>
  return (
    <img
      src={hit[1]}
      alt=""
      style={{ maxHeight: 56, maxWidth: 260, objectFit: "contain", borderRadius: 4 }}
    />
  )
}

/** Một thẻ nhập tay: mặt trước / mặt sau, ngăn nhau bằng `|` trên cùng một dòng. */
const parseBulkCards = (raw: string): Array<{ front: string; back: string }> =>
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf("|");
      // Không có dấu ngăn thì coi cả dòng là mặt trước — thà tạo thẻ thiếu mặt sau còn hơn
      // nuốt mất dòng người ta vừa gõ.
      return at < 0
        ? { front: line, back: "" }
        : { front: line.slice(0, at).trim(), back: line.slice(at + 1).trim() };
    })
    .filter((card) => card.front.length > 0);

/**
 * Quản bộ thẻ ghi nhớ của môn ngay trong admin: tạo bộ mới, sửa bậc trả phí, thêm/xoá thẻ.
 *
 * Bậc `PREMIUM` là thứ khoá bộ thẻ sau gói hội viên; `previewLimit` là số thẻ người chưa mua
 * được học thử. Hai giá trị đó nằm ở DB chứ không phải hằng số trong code, nên sửa ở đây là
 * đổi được ngay, không phải deploy.
 */
export function FlashcardsTab({ subject }: FlashcardsTabProps) {
  const code = subject.code;
  const { data, isLoading } = useSubjectFlashcards(code);
  const createDeck = useCreateFlashcardDeck(code);
  const updateDeck = useUpdateFlashcardDeck(code);
  const deleteDeck = useDeleteFlashcardDeck(code);
  const addCards = useAddFlashcardCards(code);
  const deleteCard = useDeleteFlashcardCard(code);

  const [deckForm] = Form.useForm<DeckFormValues>();
  const [cardForm] = Form.useForm<{ bulk: string }>();
  const [editing, setEditing] = useState<AdminFlashcardDeck | null>(null);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [cardsOf, setCardsOf] = useState<AdminFlashcardDeck | null>(null);

  const decks = useMemo(() => data?.decks ?? [], [data]);
  const openCards = useMemo(
    () => (cardsOf ? decks.find((d) => d.id === cardsOf.id) ?? cardsOf : null),
    [decks, cardsOf]
  );

  const openCreate = () => {
    setEditing(null);
    deckForm.setFieldsValue({
      title: "",
      description: "",
      status: "PUBLISHED",
      accessTier: "PREMIUM",
      previewLimit: 5,
    });
    setDeckModalOpen(true);
  };

  const openEdit = (deck: AdminFlashcardDeck) => {
    setEditing(deck);
    deckForm.setFieldsValue({
      title: deck.title,
      description: deck.description ?? "",
      status: deck.status,
      accessTier: deck.accessTier,
      previewLimit: deck.previewLimit,
    });
    setDeckModalOpen(true);
  };

  const submitDeck = async () => {
    const values = await deckForm.validateFields();
    if (editing) {
      await updateDeck.mutateAsync({ deckId: editing.id, values });
      message.success("Đã cập nhật bộ thẻ");
    } else {
      await createDeck.mutateAsync(values);
      message.success("Đã tạo bộ thẻ");
    }
    setDeckModalOpen(false);
  };

  const submitCards = async () => {
    const { bulk } = await cardForm.validateFields();
    const cards = parseBulkCards(bulk);
    if (cards.length === 0) {
      message.warning("Chưa có thẻ nào hợp lệ");
      return;
    }
    if (!openCards) return;
    await addCards.mutateAsync({ deckId: openCards.id, cards });
    message.success(`Đã thêm ${cards.length} thẻ`);
    cardForm.resetFields();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Bộ thẻ ghi nhớ ({data?.deckCount ?? 0} bộ · {data?.totalCards ?? 0} thẻ)
        </Typography.Title>
        <Can permissions={["subject.manage"]}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo bộ thẻ
          </Button>
        </Can>
      </Space>

      {!isLoading && decks.length === 0 ? (
        <Empty description="Môn này chưa có bộ thẻ nào" />
      ) : (
        <Table<AdminFlashcardDeck>
          rowKey="id"
          loading={isLoading}
          dataSource={decks}
          pagination={false}
          columns={[
            { title: "Tên bộ", dataIndex: "title" },
            { title: "Số thẻ", dataIndex: "cardCount", width: 100 },
            {
              title: "Bậc",
              dataIndex: "accessTier",
              width: 150,
              render: (tier: string, deck) =>
                tier === "PREMIUM" ? (
                  <Tag color="gold">Hội viên · thử {deck.previewLimit}</Tag>
                ) : (
                  <Tag color="green">Miễn phí</Tag>
                ),
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 130,
              render: (status: string) => <Tag>{status}</Tag>,
            },
            {
              title: "",
              width: 220,
              render: (_: unknown, deck) => (
                <Space>
                  <Button size="small" onClick={() => setCardsOf(deck)}>
                    Thẻ
                  </Button>
                  <Can permissions={["subject.manage"]}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(deck)} />
                  </Can>
                  <Can permissions={["subject.manage"]}>
                    <Popconfirm
                      title="Xoá bộ thẻ này?"
                      description="Xoá luôn toàn bộ thẻ và tiến độ ôn của người học. Muốn giữ lịch sử thì đổi trạng thái sang ARCHIVED."
                      okButtonProps={{ danger: true }}
                      onConfirm={async () => {
                        await deleteDeck.mutateAsync(deck.id);
                        message.success("Đã xoá bộ thẻ");
                      }}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Can>
                </Space>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={deckModalOpen}
        title={editing ? "Sửa bộ thẻ" : "Tạo bộ thẻ"}
        onCancel={() => setDeckModalOpen(false)}
        onOk={submitDeck}
        confirmLoading={createDeck.isPending || updateDeck.isPending}
        destroyOnClose
      >
        <Form form={deckForm} layout="vertical">
          <Form.Item name="title" label="Tên bộ" rules={[{ required: true, message: "Nhập tên bộ" }]}>
            <Input placeholder={`Kho thẻ ghi nhớ ${code}`} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select
              options={[
                { value: "PUBLISHED", label: "PUBLISHED — người học thấy" },
                { value: "DRAFT", label: "DRAFT — chỉ người quản thấy" },
                { value: "ARCHIVED", label: "ARCHIVED — ẩn nhưng giữ lịch sử" },
              ]}
            />
          </Form.Item>
          <Form.Item name="accessTier" label="Bậc trả phí">
            <Select
              options={[
                { value: "PREMIUM", label: "PREMIUM — cần gói hội viên" },
                { value: "FREE", label: "FREE — ai cũng học đủ" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="previewLimit"
            label="Số thẻ học thử"
            tooltip="Số thẻ đầu người chưa mua gói được học. Chỉ có tác dụng với bộ PREMIUM."
            rules={[{ type: "number", min: 0, max: 500, message: "Trong khoảng 0..500" }]}
          >
            <InputNumber min={0} max={500} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(openCards)}
        title={openCards ? `Thẻ trong "${openCards.title}"` : ""}
        onCancel={() => setCardsOf(null)}
        footer={null}
        width={820}
        destroyOnClose
      >
        <Can permissions={["subject.manage"]}>
          <Form form={cardForm} layout="vertical" style={{ marginBottom: 16 }}>
            <Form.Item
              name="bulk"
              label="Thêm thẻ (mỗi dòng một thẻ, ngăn mặt trước/mặt sau bằng dấu |)"
              rules={[{ required: true, message: "Nhập ít nhất một thẻ" }]}
            >
              <Input.TextArea
                rows={4}
                placeholder={"Câu hỏi 1 | Đáp án 1\nCâu hỏi 2 | Đáp án 2"}
              />
            </Form.Item>
            <Button type="primary" onClick={submitCards} loading={addCards.isPending}>
              Thêm thẻ
            </Button>
          </Form>
        </Can>

        <Table<AdminFlashcardCard>
          rowKey="id"
          size="small"
          dataSource={openCards?.cards ?? []}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          columns={[
            {
              title: "Mặt trước",
              dataIndex: "front",
              ellipsis: true,
              render: (v: string) => <CardFace value={v} />,
            },
            { title: "Mặt sau", dataIndex: "back", ellipsis: true },
            {
              title: "",
              width: 60,
              render: (_: unknown, card) => (
                <Can permissions={["subject.manage"]}>
                  <Popconfirm
                    title="Xoá thẻ này?"
                    okButtonProps={{ danger: true }}
                    onConfirm={async () => {
                      await deleteCard.mutateAsync(card.id);
                      message.success("Đã xoá thẻ");
                    }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Can>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
