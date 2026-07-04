import { useMemo, useState } from "react";
import { Input, Tree } from "antd";
import type { TreeDataNode } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { PermissionCatalog } from "../types";

interface PermissionTreeProps {
  catalog: PermissionCatalog | undefined;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function PermissionTree({ catalog, value, onChange, disabled }: PermissionTreeProps) {
  const [search, setSearch] = useState("");

  const { treeData, allKeys } = useMemo(() => {
    const keys: string[] = [];
    const data: TreeDataNode[] =
      catalog?.domains.map((domain) => {
        const domainKeys: string[] = [];
        const children = domain.permissions
          .filter(
            (p) =>
              search === "" ||
              p.key.toLowerCase().includes(search.toLowerCase()) ||
              p.description.toLowerCase().includes(search.toLowerCase())
          )
          .map((p) => {
            domainKeys.push(p.key);
            keys.push(p.key);
            return {
              key: p.key,
              title: (
                <span>
                  <strong>{p.key}</strong>
                  <span style={{ color: "#888", marginLeft: 8 }}>{p.description}</span>
                  {p.scopable && (
                    <span style={{ color: "#3F51B5", marginLeft: 8, fontSize: 12 }}>
                      (scopable)
                    </span>
                  )}
                </span>
              ),
            };
          });

        return {
          key: `domain-${domain.domain}`,
          title: `${domain.domain} (${children.length})`,
          children,
          disabled: children.length === 0,
        };
      }) ?? [];

    return { treeData: data, allKeys: keys };
  }, [catalog, search]);

  const checkedCount = value.length;

  return (
    <div>
      <Input
        placeholder="Tìm permission theo key hoặc mô tả"
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />
      <div style={{ marginBottom: 8, fontWeight: 500 }}>
        Đã chọn {checkedCount}/{allKeys.length} quyền
      </div>
      <Tree
        checkable
        treeData={treeData}
        checkedKeys={value}
        onCheck={(checked) => onChange(checked as string[])}
        disabled={disabled}
        style={{ maxHeight: 400, overflow: "auto" }}
      />
    </div>
  );
}
