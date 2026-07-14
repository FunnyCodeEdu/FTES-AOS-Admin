import { useState } from "react";
import { Button, Form, Input, InputNumber, List, Modal, Popconfirm, Space, Typography, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  useBlogCategories,
  useCreateBlogCategory,
  useDeleteBlogCategory,
  useUpdateBlogCategory,
} from "../api/blog.api";
import type { BlogCategory, BlogCategoryFormValues } from "../types";

interface BlogCategoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function BlogCategoryModal({ open, onClose }: BlogCategoryModalProps) {
  const [form] = Form.useForm<BlogCategoryFormValues>();
  const [editing, setEditing] = useState<BlogCategory | null>(null);

  const { data: categories, isLoading } = useBlogCategories();
  const createCategory = useCreateBlogCategory();
  const updateCategory = useUpdateBlogCategory();
  const deleteCategory = useDeleteBlogCategory();

  const resetForm = () => {
    setEditing(null);
    form.resetFields();
  };

  const handleSubmit = (values: BlogCategoryFormValues) => {
    if (editing) {
      updateCategory.mutate(
        { id: editing.id, ...values },
        {
          onSuccess: () => {
            message.success("Đã cập nhật danh mục");
            resetForm();
          },
        }
      );
    } else {
      createCategory.mutate(values, {
        onSuccess: () => {
          message.success("Đã tạo danh mục");
          resetForm();
        },
      });
    }
  };

  const startEdit = (category: BlogCategory) => {
    setEditing(category);
    form.setFieldsValue({
      name: category.name,
      sortOrder: category.sortOrder ?? 0,
    });
  };

  return (
    <Modal
      open={open}
      title="Quản lý danh mục blog"
      onCancel={() => {
        resetForm();
        onClose();
      }}
      footer={null}
      width={560}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Tên danh mục"
          rules={[{ required: true, message: "Vui lòng nhập tên danh mục" }]}
        >
          <Input placeholder="VD: Kinh nghiệm học tập" />
        </Form.Item>
        <Form.Item
          name="sortOrder"
          label="Thứ tự"
          initialValue={0}
          extra="Số nhỏ hiển thị trước. Slug tự sinh từ tên."
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            icon={editing ? <EditOutlined /> : <PlusOutlined />}
            loading={createCategory.isPending || updateCategory.isPending}
          >
            {editing ? "Cập nhật" : "Thêm danh mục"}
          </Button>
          {editing && <Button onClick={resetForm}>Huỷ sửa</Button>}
        </Space>
      </Form>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Danh sách danh mục
      </Typography.Title>
      <List
        loading={isLoading}
        dataSource={categories ?? []}
        locale={{ emptyText: "Chưa có danh mục nào" }}
        renderItem={(category) => (
          <List.Item
            actions={[
              <Button
                key="edit"
                size="small"
                icon={<EditOutlined />}
                onClick={() => startEdit(category)}
              >
                Sửa
              </Button>,
              <Popconfirm
                key="delete"
                title="Xoá danh mục này?"
                okText="Xoá"
                okType="danger"
                cancelText="Huỷ"
                onConfirm={() =>
                  deleteCategory.mutate(category.id, {
                    onSuccess: () => message.success("Đã xoá danh mục"),
                  })
                }
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  Xoá
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta title={category.name} description={category.slug} />
          </List.Item>
        )}
      />
    </Modal>
  );
}
