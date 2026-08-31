import { useEffect } from "react";
import { App, Button, Card, Form, Input, Space, Skeleton, Typography, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useGroupProfile, useUpdateGroupProfile, useUploadGroupMedia } from "../api/community.api";

/**
 * Sửa ẢNH và MÔ TẢ của nhóm cộng đồng từ Admin.
 *
 * <p>Trước đây trang chi tiết nhóm chỉ có Đổi owner / Khoá group / Gán CTV — không có chỗ nào đặt
 * ảnh hay mô tả, đúng thứ thầy báo thiếu. Dữ liệu đọc qua REST community chứ không qua GraphQL
 * `adminGroup`: query đó không trả description lẫn ảnh (mã cũ hardcode `description: ""`), và mở
 * rộng nó phải sửa hợp đồng RPC nằm trong jar dựng sẵn `ftes-aos-contracts`.
 *
 * <p>Quyền: `GroupService.requireManage` chấp nhận ADMIN toàn cục (`hasGlobalModeration`), nên
 * admin nền tảng thao tác được mà không cần là thành viên nhóm.
 */
export function GroupProfileTab({ groupId }: { groupId: string | undefined }) {
  const { message } = App.useApp();
  const { data, isLoading } = useGroupProfile(groupId);
  const updateProfile = useUpdateGroupProfile(groupId);
  const uploadMedia = useUploadGroupMedia(groupId);
  const [form] = Form.useForm<{ name: string; description: string }>();

  useEffect(() => {
    if (data) {
      form.setFieldsValue({ name: data.name, description: data.description ?? "" });
    }
  }, [data, form]);

  // Upload thủ công: AntD mặc định tự POST lên `action`, nhưng đường đi ở đây là BA bước
  // (presign → upload → verify) nên phải tự chạy và luôn trả false để AntD đứng ngoài.
  const pickerFor = (kind: "AVATAR" | "COVER"): UploadProps => ({
    showUploadList: false,
    accept: "image/png,image/jpeg,image/webp",
    beforeUpload: (file) => {
      uploadMedia.mutate(
        { kind, file },
        {
          onSuccess: () =>
            message.success(kind === "AVATAR" ? "Đã đổi ảnh đại diện" : "Đã đổi ảnh bìa"),
          onError: (e: Error) => message.error(e.message || "Đổi ảnh thất bại"),
        }
      );
      return false;
    },
  });

  if (isLoading) return <Skeleton active paragraph={{ rows: 5 }} />;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card title="Ảnh nhóm" size="small">
        <Space size={24} align="start" wrap>
          <div>
            <Typography.Text type="secondary">Ảnh đại diện</Typography.Text>
            <div style={{ marginTop: 8 }}>
              {data?.avatarUrl ? (
                <img
                  src={data.avatarUrl}
                  alt="Ảnh đại diện nhóm"
                  style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }}
                />
              ) : (
                <Typography.Text type="secondary">Chưa có</Typography.Text>
              )}
            </div>
            <Upload {...pickerFor("AVATAR")}>
              <Button icon={<UploadOutlined />} style={{ marginTop: 8 }} loading={uploadMedia.isPending}>
                Đổi ảnh đại diện
              </Button>
            </Upload>
          </div>
          <div>
            <Typography.Text type="secondary">Ảnh bìa</Typography.Text>
            <div style={{ marginTop: 8 }}>
              {data?.coverUrl ? (
                <img
                  src={data.coverUrl}
                  alt="Ảnh bìa nhóm"
                  style={{ width: 240, height: 96, objectFit: "cover", borderRadius: 8 }}
                />
              ) : (
                <Typography.Text type="secondary">Chưa có</Typography.Text>
              )}
            </div>
            <Upload {...pickerFor("COVER")}>
              <Button icon={<UploadOutlined />} style={{ marginTop: 8 }} loading={uploadMedia.isPending}>
                Đổi ảnh bìa
              </Button>
            </Upload>
          </div>
        </Space>
      </Card>

      <Card title="Tên & mô tả" size="small">
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            updateProfile.mutate(values, {
              onSuccess: () => message.success("Đã lưu thông tin nhóm"),
              onError: (e: Error) => message.error(e.message || "Lưu thất bại"),
            })
          }
        >
          <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, message: "Nhập tên nhóm" }]}>
            <Input maxLength={150} showCount />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={5} maxLength={2000} showCount placeholder="Mô tả hiển thị ở trang nhóm" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={updateProfile.isPending}>
            Lưu
          </Button>
        </Form>
      </Card>
    </Space>
  );
}
