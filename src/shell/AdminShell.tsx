import { Layout, Typography } from "antd";

/**
 * Placeholder shell — sidebar sinh từ permissions + console routes spec tại
 * openspec/changes/admin-foundation và các admin-*-console.
 */
export default function AdminShell() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Sider theme="light" />
      <Layout>
        <Layout.Header style={{ background: "#fff" }} />
        <Layout.Content style={{ padding: 24 }}>
          <Typography.Text>
            FTES AOS Admin — shell chờ implement theo openspec/changes/admin-foundation.
          </Typography.Text>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
