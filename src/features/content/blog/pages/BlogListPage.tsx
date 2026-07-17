import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import {
  useBlogCategories,
  useBlogPosts,
  useDeleteBlogPost,
  usePublishBlogPost,
  useUnpublishBlogPost,
} from "../api/blog.api";
import { BlogCategoryModal } from "../components/BlogCategoryModal";
import type { BlogPost } from "../types";

const DEFAULT_PAGE_SIZE = 10;

const PUBLISHED_OPTIONS = [
  { label: "Đã xuất bản", value: "true" },
  { label: "Bản nháp", value: "false" },
];

export default function BlogListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const categoryId = searchParams.get("categoryId") ?? undefined;
  const publishedParam = searchParams.get("published") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);

  const { data, isLoading, isError, error, refetch } = useBlogPosts({
    categoryId,
    published: publishedParam === undefined ? undefined : publishedParam === "true",
    page,
    pageSize,
  });
  const { data: categories } = useBlogCategories();
  const publishPost = usePublishBlogPost();
  const unpublishPost = useUnpublishBlogPost();
  const deletePost = useDeleteBlogPost();

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  const handleDelete = (post: BlogPost) => {
    Modal.confirm({
      title: "Xoá bài viết",
      content: (
        <>
          Bạn chuẩn bị xoá bài <strong>{post.title}</strong>. Thao tác này không thể hoàn tác.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () =>
        deletePost.mutate(post.id, {
          onSuccess: () => message.success("Đã xoá bài viết"),
        }),
    });
  };

  const columns: TableProps<BlogPost>["columns"] = [
    { title: "Tiêu đề", dataIndex: "title" },
    {
      title: "Danh mục",
      dataIndex: "categoryName",
      render: (name?: string) => name ?? "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "published",
      render: (published: boolean) =>
        published ? <Tag color="green">Đã xuất bản</Tag> : <Tag>Bản nháp</Tag>,
    },
    {
      title: "Lượt xem",
      dataIndex: "viewCount",
      render: (count?: number) => count ?? 0,
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      render: (value?: string) => (value ? new Date(value).toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: BlogPost) => (
        <Can permissions={["blog.manage"]}>
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/content/blog/${record.id}`)}
            >
              Sửa
            </Button>
            <Button
              size="small"
              icon={<CommentOutlined />}
              onClick={() => navigate(`/content/blog/${record.id}/comments`)}
            >
              Bình luận
            </Button>
            {record.published ? (
              <Button
                size="small"
                onClick={() =>
                  unpublishPost.mutate(record.id, {
                    onSuccess: () => message.success("Đã gỡ xuất bản"),
                  })
                }
              >
                Gỡ
              </Button>
            ) : (
              <Button
                size="small"
                type="primary"
                onClick={() =>
                  publishPost.mutate(record.id, {
                    onSuccess: () => message.success("Đã xuất bản"),
                  })
                }
              >
                Xuất bản
              </Button>
            )}
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
              Xoá
            </Button>
          </Space>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Blog</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Select
                placeholder="Danh mục"
                allowClear
                value={categoryId}
                style={{ width: 200 }}
                onChange={(value) => updateParams({ categoryId: value, page: undefined })}
                options={(categories ?? []).map((c) => ({ label: c.name, value: c.id }))}
              />
              <Select
                placeholder="Trạng thái"
                allowClear
                value={publishedParam}
                style={{ width: 160 }}
                onChange={(value) => updateParams({ published: value, page: undefined })}
                options={PUBLISHED_OPTIONS}
              />
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["blog.manage"]}>
                <Button icon={<FolderOutlined />} onClick={() => setCategoryModalOpen(true)}>
                  Danh mục
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/content/blog/new")}
                >
                  Viết bài
                </Button>
              </Can>
            </Space>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách bài viết"
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
            pagination={{
              current: page,
              pageSize,
              total: data?.total ?? 0,
              // Cap khớp BE MAX_SIZE=50: không cho antd tự thêm 100 (sẽ desync offset FE↔BE).
              pageSizeOptions: [10, 20, 50],
              onChange: (p: number, ps: number) => updateParams({ page: p, pageSize: ps }),
            }}
          />
        </Space>
      </Card>

      <BlogCategoryModal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} />
    </div>
  );
}
