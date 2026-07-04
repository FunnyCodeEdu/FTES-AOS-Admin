import { useMemo, useState } from "react";
import { Card, Collapse, Input, Space, Tag, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { usePermissionCatalog } from "../api";

export default function PermissionCatalogPage() {
  const [search, setSearch] = useState("");
  const { data: catalog, isLoading } = usePermissionCatalog();

  const filteredDomains = useMemo(() => {
    if (!catalog) return [];
    if (!search.trim()) return catalog.domains;
    const term = search.toLowerCase();
    return catalog.domains
      .map((d) => ({
        ...d,
        permissions: d.permissions.filter(
          (p) =>
            p.key.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
        ),
      }))
      .filter((d) => d.permissions.length > 0);
  }, [catalog, search]);

  return (
    <div>
      <Typography.Title level={3}>Catalog quyền</Typography.Title>
      <Card loading={isLoading}>
        <Input
          placeholder="Tìm permission theo key hoặc mô tả"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ marginBottom: 16 }}
        />

        <Collapse>
          {filteredDomains.map((domain) => (
            <Collapse.Panel header={`${domain.domain} (${domain.permissions.length})`} key={domain.domain}>
              {domain.permissions.map((perm) => (
                <Card key={perm.key} size="small" style={{ marginBottom: 8 }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Space>
                      <Typography.Text strong>{perm.key}</Typography.Text>
                      {perm.scopable && <Tag color="blue">scopable</Tag>}
                    </Space>
                    <Typography.Text type="secondary">{perm.description}</Typography.Text>
                    {perm.roles.length > 0 && (
                      <div>
                        <Typography.Text type="secondary">Vai trò: </Typography.Text>
                        {perm.roles.map((roleName) => (
                          <Typography.Link key={roleName}>
                            <Link to={`/system/rbac/roles`}>{roleName}</Link>
                          </Typography.Link>
                        ))}
                      </div>
                    )}
                  </Space>
                </Card>
              ))}
            </Collapse.Panel>
          ))}
        </Collapse>
      </Card>
    </div>
  );
}
