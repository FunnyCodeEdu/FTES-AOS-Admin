import { useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import {
  useBlogCategories,
  useBlogPost,
  useCreateBlogPost,
  usePublishBlogPost,
  useUnpublishBlogPost,
  useUpdateBlogPost,
} from "../api/blog.api";
import { MarkdownEditor } from "../components/MarkdownEditor";
import type { BlogPostFormValues } from "../types";

// Vietnamese-aware slugifier: strip diacritics, keep [a-z0-9-].
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<BlogPostFormValues>();

  const [dirty, setDirty] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  // Saved via the buttons — lets the navigation blocker skip the confirm.
  const savedRef = useRef(false);

  const { data: post, isLoading } = useBlogPost(id);
  const { data: categories } = useBlogCategories();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost(id);
  const publishPost = usePublishBlogPost();
  const unpublishPost = useUnpublishBlogPost();

  const isSaving = createPost.isPending || updatePost.isPending;

  useEffect(() => {
    if (post) {
      form.setFieldsValue({
        title: post.title,
        slug: post.slug,
        categoryId: post.categoryId,
        thumbnailUrl: post.thumbnailUrl ?? "",
        content: post.content,
      });
      setSlugEdited(true);
      setDirty(false);
    }
  }, [post, form]);

  // Warn on browser tab close/reload with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Block in-app navigation while there are unsaved changes.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !savedRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      Modal.confirm({
        title: "Rời khỏi trang?",
        content: "Bạn có thay đổi chưa lưu. Rời trang sẽ mất các thay đổi này.",
        okText: "Rời trang",
        okType: "danger",
        cancelText: "Ở lại",
        onOk: () => blocker.proceed?.(),
        onCancel: () => blocker.reset?.(),
      });
    }
  }, [blocker]);

  const handleValuesChange = (
    changed: Partial<BlogPostFormValues>,
    all: BlogPostFormValues
  ) => {
    setDirty(true);
    if ("slug" in changed) {
      setSlugEdited(true);
    }
    if ("title" in changed && !slugEdited) {
      form.setFieldValue("slug", slugify(all.title ?? ""));
    }
  };

  // Persist (create or update), returns the post id for follow-up publish.
  const persist = async (values: BlogPostFormValues): Promise<string | undefined> => {
    if (isEdit) {
      await updatePost.mutateAsync(values);
      return id;
    }
    const created = await createPost.mutateAsync(values);
    return created.id;
  };

  const handleSaveDraft = () => {
    form.validateFields().then(async (values: BlogPostFormValues) => {
      try {
        const savedId = await persist(values);
        savedRef.current = true;
        setDirty(false);
        message.success("Đã lưu nháp");
        if (!isEdit && savedId) {
          navigate(`/content/blog/${savedId}`, { replace: true });
        }
      } catch {
        // errors surfaced via mutation onError (handleAdminMutationError)
      }
    });
  };

  const handlePublish = () => {
    form.validateFields().then(async (values: BlogPostFormValues) => {
      try {
        const savedId = await persist(values);
        if (savedId) {
          await publishPost.mutateAsync(savedId);
        }
        savedRef.current = true;
        setDirty(false);
        message.success("Đã xuất bản bài viết");
        if (!isEdit && savedId) {
          navigate(`/content/blog/${savedId}`, { replace: true });
        }
      } catch {
        // handled by mutation onError
      }
    });
  };

  const handleUnpublish = () => {
    if (!id) return;
    unpublishPost.mutate(id, {
      onSuccess: () => message.success("Đã gỡ xuất bản"),
    });
  };

  if (isEdit && isLoading && !post) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/content/blog")}>
          Danh sách
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {isEdit ? "Sửa bài viết" : "Viết bài mới"}
        </Typography.Title>
      </Space>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          initialValues={{ title: "", slug: "", thumbnailUrl: "", content: "" }}
        >
          <Form.Item
            label="Tiêu đề"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
          >
            <Input placeholder="Tiêu đề bài viết" />
          </Form.Item>
          <Form.Item
            label="Slug"
            name="slug"
            rules={[{ required: true, message: "Vui lòng nhập slug" }]}
            extra="Tự sinh từ tiêu đề, có thể chỉnh tay."
          >
            <Input placeholder="tieu-de-bai-viet" />
          </Form.Item>
          <Form.Item label="Danh mục" name="categoryId">
            <Select
              allowClear
              placeholder="Chọn danh mục"
              options={(categories ?? []).map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item label="Ảnh thumbnail (URL)" name="thumbnailUrl">
            <Input placeholder="https://cdn.ftes.vn/blog/..." />
          </Form.Item>
          <Form.Item
            label="Nội dung"
            name="content"
            valuePropName="value"
            rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}
          >
            <MarkdownEditor />
          </Form.Item>

          <Space>
            <Button onClick={handleSaveDraft} loading={isSaving}>
              Lưu nháp
            </Button>
            <Button type="primary" onClick={handlePublish} loading={isSaving || publishPost.isPending}>
              Xuất bản
            </Button>
            {post?.published && (
              <Button danger onClick={handleUnpublish} loading={unpublishPost.isPending}>
                Gỡ xuất bản
              </Button>
            )}
          </Space>
        </Form>
      </Card>
    </div>
  );
}
