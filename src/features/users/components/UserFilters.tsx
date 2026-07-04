import { useEffect, useState } from "react";
import { Form, Input, Select, Space } from "antd";
import type { UserFilterFormValues } from "../types";

interface UserFiltersProps {
  values: UserFilterFormValues;
  onChange: (values: UserFilterFormValues) => void;
  roleOptions?: { label: string; value: string }[];
  campusOptions?: { label: string; value: string }[];
}

export function UserFilters({ values, onChange, roleOptions, campusOptions }: UserFiltersProps) {
  const [form] = Form.useForm<UserFilterFormValues>();
  const [search, setSearch] = useState(values.search ?? "");

  useEffect(() => {
    form.setFieldsValue(values);
    setSearch(values.search ?? "");
  }, [form, values]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = form.getFieldValue("search") ?? "";
      if (current !== values.search) {
        onChange({ ...values, search: current || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleValuesChange = (changed: Partial<UserFilterFormValues>, all: UserFilterFormValues) => {
    if ("search" in changed) {
      setSearch(changed.search ?? "");
    } else {
      onChange({
        search: all.search || undefined,
        role: all.role || undefined,
        status: all.status || undefined,
        campus: all.campus || undefined,
      });
    }
  };

  return (
    <Form form={form} layout="inline" initialValues={values} onValuesChange={handleValuesChange}>
      <Space wrap>
        <Form.Item name="search" style={{ marginBottom: 0 }}>
          <Input.Search placeholder="Tìm theo tên/email" allowClear style={{ minWidth: 240 }} />
        </Form.Item>
        <Form.Item name="role" style={{ marginBottom: 0 }}>
          <Select
            placeholder="Vai trò"
            allowClear
            options={roleOptions}
            style={{ minWidth: 160 }}
          />
        </Form.Item>
        <Form.Item name="status" style={{ marginBottom: 0 }}>
          <Select
            placeholder="Trạng thái"
            allowClear
            options={[
              { label: "Đang hoạt động", value: "active" },
              { label: "Đã khoá", value: "locked" },
              { label: "Chờ xác nhận", value: "pending" },
            ]}
            style={{ minWidth: 160 }}
          />
        </Form.Item>
        <Form.Item name="campus" style={{ marginBottom: 0 }}>
          <Select
            placeholder="Campus"
            allowClear
            options={campusOptions}
            style={{ minWidth: 160 }}
          />
        </Form.Item>
      </Space>
    </Form>
  );
}
