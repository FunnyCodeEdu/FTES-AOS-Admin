import { useEffect, useState } from "react";
import { Button, Descriptions, Divider, Form, Image, Input, InputNumber, Select, Typography, message } from "antd";
import { Can } from "../../../../shared/permissions";
import type { SubjectDetail, SubjectFormValues } from "../../types";
import {
  useMajors,
  useSubjectCoverImage,
  useUpdateSubjectCover,
  useUpdateSubject,
  useUpdateSubjectMajors,
} from "../api/subjects.api";

interface SubjectInfoTabProps {
  subject: SubjectDetail;
}

const COVER_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='120'%3E%3Crect width='240' height='120' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='sans-serif' font-size='13'%3E%E1%BA%A2nh kh%C3%B4ng t%E1%BA%A3i %C4%91%C6%B0%E1%BB%A3c%3C/text%3E%3C/svg%3E";

/**
 * Control ảnh bìa môn (Contract A). Đọc/ghi qua endpoint CORE theo subject CODE
 * (useSubjectCoverImage/useUpdateSubjectCover) — imageUrl KHÔNG có trên admin path. Chỉ render trong
 * <Can subject.manage> nên hook chỉ chạy cho người có quyền (tránh gọi GET core cho non-manager, và
 * khớp scenario "thiếu quyền → không thấy control"). Ô rỗng + Lưu → gửi "" để BE xoá bìa.
 */
function SubjectCoverField({ subject }: { subject: SubjectDetail }) {
  const cover = useSubjectCoverImage(subject.code);
  const update = useUpdateSubjectCover(subject);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(cover.data?.imageUrl ?? "");
  }, [cover.data]);

  const preview = url.trim();

  const handleSave = () => {
    update.mutate(preview, {
      onSuccess: () => message.success(preview ? "Đã cập nhật ảnh bìa" : "Đã xoá ảnh bìa"),
      onError: (err: Error) => message.error(err.message || "Lưu ảnh bìa thất bại"),
    });
  };

  return (
    <div>
      <Typography.Title level={5}>Ảnh bìa môn</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
        URL ảnh bìa hiển thị trên header workspace của môn (/subjects/{subject.code}). Để trống rồi
        Lưu để xoá bìa.
      </Typography.Paragraph>
      <Input
        placeholder="https://cdn.ftes.vn/subjects/..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        allowClear
        style={{ maxWidth: 520 }}
      />
      {preview ? (
        <div style={{ marginTop: 12 }}>
          <Image
            src={preview}
            alt="Ảnh bìa môn"
            style={{ maxHeight: 160, borderRadius: 8, objectFit: "cover" }}
            fallback={COVER_FALLBACK}
          />
        </div>
      ) : null}
      <div style={{ marginTop: 12 }}>
        <Button type="primary" onClick={handleSave} loading={update.isPending} disabled={cover.isLoading}>
          Lưu ảnh bìa
        </Button>
      </div>
    </div>
  );
}

/**
 * Control NGÀNH của môn (nhiều-nhiều, V336). Danh mục qua useMajors (GET /admin/majors); ngành hiện
 * tại từ subject.majors. Lưu = PUT /admin/subjects/{id}/majors (replace toàn bộ tập ngành). Chỉ render
 * trong <Can subject.manage>.
 */
function SubjectMajorsField({ subject }: { subject: SubjectDetail }) {
  const catalog = useMajors();
  const update = useUpdateSubjectMajors(subject.id);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setSelected((subject.majors ?? []).map((m) => m.id));
  }, [subject.majors]);

  const handleSave = () => {
    update.mutate(selected, {
      onSuccess: () => message.success("Đã cập nhật ngành của môn"),
      onError: (err: Error) => message.error(err.message || "Lưu ngành thất bại"),
    });
  };

  return (
    <div>
      <Typography.Title level={5}>Ngành</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
        Một môn có thể thuộc nhiều ngành. Chọn các ngành rồi Lưu.
      </Typography.Paragraph>
      <Select
        mode="multiple"
        allowClear
        loading={catalog.isLoading}
        style={{ width: "100%", maxWidth: 520 }}
        placeholder="Chọn ngành…"
        value={selected}
        onChange={setSelected}
        optionFilterProp="label"
        options={(catalog.data ?? []).map((m) => ({ value: m.id, label: m.nameVi || m.name }))}
      />
      <div style={{ marginTop: 12 }}>
        <Button
          type="primary"
          onClick={handleSave}
          loading={update.isPending}
          disabled={catalog.isLoading}
        >
          Lưu ngành
        </Button>
      </div>
    </div>
  );
}

export function SubjectInfoTab({ subject }: SubjectInfoTabProps) {
  const [form] = Form.useForm<SubjectFormValues>();
  const update = useUpdateSubject(subject.id);

  useEffect(() => {
    form.setFieldsValue({
      code: subject.code,
      name: subject.name,
      description: subject.description,
      status: subject.status,
      recommendedSemester: subject.recommendedSemester ?? undefined,
    });
  }, [subject, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      update.mutate(values, {
        onSuccess: () => message.success("Đã cập nhật thông tin"),
        onError: (err: Error) => message.error(err.message || "Lưu thất bại"),
      });
    });
  };

  return (
    <div>
      <Typography.Title level={5}>Thông tin chung</Typography.Title>
      <Form form={form} layout="vertical">
        <Form.Item name="code" label="Mã môn" rules={[{ required: true }]}>
          <Input disabled />
        </Form.Item>
        <Form.Item name="name" label="Tên môn" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item
          name="recommendedSemester"
          label="Kì (học kỳ gợi ý trong chương trình)"
          tooltip="Kì trong lộ trình FPT, 1–9. Để trống nếu chưa xếp kì."
        >
          <InputNumber min={1} max={9} placeholder="VD: 4" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Ngừng hoạt động" },
              { value: "draft", label: "Bản nháp" },
            ]}
          />
        </Form.Item>
        <Can permissions={["subject.manage"]}>
          <Button type="primary" onClick={handleSave} loading={update.isPending}>
            Lưu thông tin
          </Button>
        </Can>
      </Form>

      <Can permissions={["subject.manage"]}>
        <Divider />
        <SubjectMajorsField subject={subject} />
      </Can>

      <Can permissions={["subject.manage"]}>
        <Divider />
        <SubjectCoverField subject={subject} />
      </Can>

      <Descriptions style={{ marginTop: 24 }} bordered column={2}>
        <Descriptions.Item label="Ngày tạo">{subject.createdAt}</Descriptions.Item>
        <Descriptions.Item label="Cập nhật">{subject.updatedAt}</Descriptions.Item>
      </Descriptions>
    </div>
  );
}
