import { Button, Card, Form, Input, Typography } from "antd";

/**
 * Placeholder — flow đầy đủ (JWT + refresh + 2FA) spec tại
 * openspec/changes/admin-foundation.
 */
export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
      }}
    >
      <Card style={{ width: 380 }}>
        <Typography.Title level={4}>FTES AOS Admin</Typography.Title>
        <Form layout="vertical" disabled>
          <Form.Item label="Email" name="email">
            <Input placeholder="admin@ftes.vn" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password">
            <Input.Password />
          </Form.Item>
          <Button type="primary" block>
            Đăng nhập (chờ implement admin-foundation)
          </Button>
        </Form>
      </Card>
    </div>
  );
}
