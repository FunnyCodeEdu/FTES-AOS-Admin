import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  HeartOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { Can } from "../../../../shared/permissions";
import {
  useBlogComments,
  useBlogPost,
  useDeleteBlogComment,
  useUpdateBlogComment,
} from "../api/blog.api";
import type { BlogComment } from "../types";

const DEFAULT_SIZE = 20;
// Cap khớp BE MAX_SIZE=50: không cho size vượt để tránh desync offset FE↔BE.
const MAX_SIZE = 50;
const CONTENT_MAX = 5000;
const MODERATION_PLACEHOLDER = "[Nội dung đã bị ẩn do vi phạm quy tắc cộng đồng]";

/** Người viết hiển thị: ưu tiên authorUsername, thiếu thì rút gọn userId. */
export function formatCommentAuthor(comment: Pick<BlogComment, "authorUsername" | "userId">): {
  label: string;
  isId: boolean;
  full: string;
} {
  const name = comment.authorUsername?.trim();
  if (name) return { label: name, isId: false, full: name };
  const id = comment.userId ?? "";
  return { label: id.length > 8 ? `${id.slice(0, 8)}…` : id, isId: true, full: id };
}

/** Trang đầu tiên (0-based) thì không cho lùi. */
export function canGoPrev(page: number): boolean {
  return page > 0;
}

/** Chỉ cho tiến khi BE báo còn trang sau. */
export function canGoNext(hasNext: boolean | undefined): boolean {
  return hasNext === true;
}

/** Ép size về khoảng hợp lệ (1..MAX_SIZE) khớp cap BE. */
export function clampCommentSize(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_SIZE;
  return Math.min(raw, MAX_SIZE);
}

export default function BlogCommentsPage() {
  const navigate = useNavigate();
  const { id: postId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(0, Number(searchParams.get("page") ?? 0));
  const size = clampCommentSize(Number(searchParams.get("size") ?? DEFAULT_SIZE));

  const { data: post } = useBlogPost(postId);
  const { data, isLoading, isError, error, refetch } = useBlogComments(postId, page, size);
  const updateComment = useUpdateBlogComment(postId);
  const deleteComment = useDeleteBlogComment(postId);

  const [editing, setEditing] = useState<BlogComment | null>(null);
  const [draft, setDraft] = useState("");

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(Math.max(0, next)));
    setSearchParams(params);
  }

  function openEdit(comment: BlogComment) {
    setEditing(comment);
    setDraft(comment.content);
  }

  function submitEdit() {
    if (!editing) return;
    const content = draft.trim();
    if (!content) {
      message.error("Nội dung không được để trống");
      return;
    }
    updateComment.mutate(
      { id: editing.id, content },
      {
        onSuccess: () => {
          message.success("Đã cập nhật bình luận");
          setEditing(null);
        },
      },
    );
  }

  function handleDelete(comment: BlogComment) {
    Modal.confirm({
      title: "Xoá bình luận",
      content: "Bạn chuẩn bị xoá vĩnh viễn bình luận này. Thao tác không thể hoàn tác.",
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () =>
        deleteComment.mutate(comment.id, {
          onSuccess: () => message.success("Đã xoá bình luận"),
        }),
    });
  }

  const columns: TableProps<BlogComment>["columns"] = [
    {
      title: "Người viết",
      key: "author",
      width: 180,
      render: (_: unknown, record: BlogComment) => {
        const author = formatCommentAuthor(record);
        if (!author.isId) return author.label;
        return (
          <Tooltip title={author.full}>
            <Typography.Text code>{author.label}</Typography.Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Nội dung",
      dataIndex: "content",
      render: (content: string) => (
        <Typography.Paragraph
          style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}
          ellipsis={{ rows: 2, expandable: true, symbol: "Xem thêm" }}
        >
          {content}
        </Typography.Paragraph>
      ),
    },
    {
      title: "Tim",
      dataIndex: "emojiCount",
      width: 90,
      render: (count?: number) => (
        <Space size={4}>
          <HeartOutlined /> {count ?? 0}
        </Space>
      ),
    },
    {
      title: "Lúc",
      dataIndex: "createdAt",
      width: 150,
      render: (value?: string) => (value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—"),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 180,
      render: (_: unknown, record: BlogComment) => (
        <Can permissions={["blog.manage"]}>
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              Ẩn/biên tập
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              Xoá
            </Button>
          </Space>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/content/blog")}>
          Quay lại
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Bình luận{post?.title ? ` — ${post.title}` : ""}
        </Typography.Title>
      </Space>

      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space style={{ justifyContent: "flex-end", width: "100%" }}>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Làm mới
            </Button>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải bình luận"
              description={error?.message}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          <Table
            rowKey="id"
            columns={columns}
            dataSource={data?.items ?? []}
            loading={isLoading}
            pagination={false}
            locale={{ emptyText: "Bài viết chưa có bình luận" }}
          />

          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <Typography.Text type="secondary">Trang {page + 1}</Typography.Text>
            <Space>
              <Button disabled={!canGoPrev(page)} onClick={() => goToPage(page - 1)}>
                Trang trước
              </Button>
              <Button disabled={!canGoNext(data?.hasNext)} onClick={() => goToPage(page + 1)}>
                Trang sau
              </Button>
            </Space>
          </Space>
        </Space>
      </Card>

      <Modal
        open={!!editing}
        title="Ẩn/biên tập bình luận"
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={updateComment.isPending}
        onOk={submitEdit}
        onCancel={() => setEditing(null)}
      >
        <Typography.Paragraph type="secondary">
          Thay nội dung vi phạm bằng ghi chú kiểm duyệt, vd: {MODERATION_PLACEHOLDER}
        </Typography.Paragraph>
        <Button size="small" style={{ marginBottom: 8 }} onClick={() => setDraft(MODERATION_PLACEHOLDER)}>
          Chèn ghi chú kiểm duyệt
        </Button>
        <Input.TextArea
          value={draft}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
          maxLength={CONTENT_MAX}
          showCount
          autoSize={{ minRows: 3, maxRows: 8 }}
        />
      </Modal>
    </div>
  );
}
