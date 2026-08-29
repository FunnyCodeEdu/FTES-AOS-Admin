import { useEffect } from "react";
import { DatePicker, Form, Input, InputNumber, Modal, Radio, Select, Switch } from "antd";
import dayjs from "dayjs";
import type { OfficialEvent, OfficialEventMode, OfficialEventType } from "../shared/types";

/** Giá trị wizard trả ra — trùng khuôn `CreateEventInput` của events.api.ts. */
export interface EventWizardValues {
  type: OfficialEventType;
  title: string;
  description?: string;
  schedule: { startAt: string; endAt?: string };
  mode: OfficialEventMode;
  capacity?: number;
  location?: string;
  onlineLink?: string;
  certificateConfig?: { enabled: boolean; templateId?: string };
  rewardConfig?: { enabled: boolean; points?: number };
}

interface EventWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: EventWizardValues) => void;
  confirmLoading?: boolean;
  /**
   * Có `initial` = chế độ SỬA (prefill + đổi tiêu đề/nhãn nút); không có = chế độ TẠO.
   * Suy ra chế độ từ chính dữ liệu thay vì thêm prop `mode` — form đã có một field tên `mode`
   * (online/offline), đặt trùng tên chỉ tổ đọc nhầm.
   */
  initial?: EventWizardValues;
}

const TYPE_OPTIONS: { label: string; value: OfficialEventType }[] = [
  { label: "Webinar", value: "webinar" },
  { label: "Workshop", value: "workshop" },
  { label: "Hackathon", value: "hackathon" },
  { label: "Ghép đôi", value: "matchmaking" },
];

/**
 * Sự kiện ở đường đọc → giá trị form. Dùng cho cả prefill lẫn làm MỐC SO SÁNH của PATCH partial,
 * nên phải là cùng một hàm: mốc lệch khuôn với giá trị form sẽ đẻ ra field "đổi" giả.
 */
export function toEventWizardValues(event: OfficialEvent): EventWizardValues {
  return {
    type: event.type,
    title: event.title,
    description: event.description ?? undefined,
    schedule: { startAt: event.schedule.startAt, endAt: event.schedule.endAt ?? undefined },
    // Giữ NGUYÊN hình thức thật, kể cả HYBRID. Trước đây chỗ này ép hybrid → "online" để radio có
    // giá trị, nhưng như vậy form nói dối: tab Tổng quan in "hybrid" còn form sửa hiện "Online", và
    // chỉ cần người dùng chạm vào ô Hình thức là HYBRID bị hạ xuống ONLINE/ONSITE.
    mode: event.mode,
    capacity: event.capacity ?? undefined,
    location: event.location ?? undefined,
    onlineLink: event.onlineLink ?? undefined,
  };
}

export function EventWizardModal({ open, onClose, onSubmit, confirmLoading, initial }: EventWizardModalProps) {
  const [form] = Form.useForm();
  const mode = Form.useWatch("mode", form);
  const certEnabled = Form.useWatch(["certificateConfig", "enabled"], form);
  const rewardEnabled = Form.useWatch(["rewardConfig", "enabled"], form);
  const isEdit = initial !== undefined;

  // Nạp giá trị đúng MỘT lần cho mỗi lần mở modal. Cố tình không phụ thuộc `initial`: object đó do
  // trang cha dựng lại sau mỗi lần refetch, nếu để vào deps thì một nhịp refetch giữa chừng sẽ ghi
  // đè thứ người dùng đang gõ dở.
  useEffect(() => {
    if (!open) return;
    if (initial) {
      form.setFieldsValue({
        type: initial.type,
        title: initial.title,
        description: initial.description,
        startAt: initial.schedule.startAt ? dayjs(initial.schedule.startAt) : undefined,
        endAt: initial.schedule.endAt ? dayjs(initial.schedule.endAt) : undefined,
        mode: initial.mode,
        location: initial.location,
        onlineLink: initial.onlineLink,
        capacity: initial.capacity,
      });
    } else {
      form.resetFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit({
        ...values,
        schedule: {
          startAt: values.startAt?.toISOString(),
          endAt: values.endAt?.toISOString(),
        },
      });
      // Chế độ sửa KHÔNG reset: reset sẽ kéo form về default của chế độ tạo (webinar/online) ngay
      // trong lúc modal còn hiện chờ mutation xong.
      if (!isEdit) form.resetFields();
    });
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Sửa event vận hành" : "Tạo event vận hành"}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isEdit ? "Lưu thay đổi" : "Tạo"}
      cancelText="Huỷ"
      width={640}
    >
      <Form form={form} layout="vertical" initialValues={{ type: "webinar", mode: "online", certificateConfig: { enabled: false }, rewardConfig: { enabled: false } }}>
        <Form.Item label="Loại" name="type" rules={[{ required: true }]}>
          <Select options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item label="Tiêu đề" name="title" rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Mô tả" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Time bắt đầu" name="startAt" rules={[{ required: true, message: "Vui lòng chọn time bắt đầu" }]}>
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        {/* BE bắt buộc endAt (end_at NOT NULL + CHECK end_at > start_at) → validate ngay tại form. */}
        <Form.Item
          label="Time kết thúc"
          name="endAt"
          dependencies={["startAt"]}
          rules={[
            { required: true, message: "Vui lòng chọn time kết thúc" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const startAt = getFieldValue("startAt");
                if (!value || !startAt || value.isAfter(startAt)) return Promise.resolve();
                return Promise.reject(new Error("Time kết thúc phải sau time bắt đầu"));
              },
            }),
          ]}
        >
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Hình thức" name="mode" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="online">Online</Radio>
            <Radio value="offline">Offline</Radio>
            <Radio value="hybrid">Kết hợp</Radio>
          </Radio.Group>
        </Form.Item>
        {mode === "offline" && (
          <Form.Item label="Địa điểm" name="location" rules={[{ required: true, message: "Vui lòng nhập địa điểm" }]}>
            <Input />
          </Form.Item>
        )}
        {(mode === "online" || mode === "hybrid") && (
          <Form.Item
            label={mode === "hybrid" ? "Link online / địa điểm" : "Link online"}
            name="onlineLink"
            /* BE chỉ có MỘT cột `venue`, và với HYBRID thì resolver trả chính chuỗi đó vào cả
               `location` lẫn `onlineLink` — nên hybrid vẫn chỉ nhập một ô, không phải hai. */
            extra={mode === "hybrid" ? "Sự kiện kết hợp dùng chung một ô: nhập link họp hoặc địa điểm." : undefined}
            rules={[{ required: true, message: "Vui lòng nhập link" }]}
          >
            <Input />
          </Form.Item>
        )}
        <Form.Item label="Sức chứa" name="capacity">
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        {/*
          Certificate/reward chỉ hiện ở chế độ TẠO: đường sửa (PATCH) không mang hai field này, để
          nguyên switch ở chế độ sửa thì gạt xong bấm Lưu sẽ không có gì thay đổi — điều khiển giả.
        */}
        {!isEdit && (
          <>
            <Form.Item label="Cấp certificate">
              <Form.Item name={["certificateConfig", "enabled"]} valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Form.Item>
            {certEnabled && (
              <Form.Item label="Template ID" name={["certificateConfig", "templateId"]}>
                <Input />
              </Form.Item>
            )}
            <Form.Item label="Cấp reward">
              <Form.Item name={["rewardConfig", "enabled"]} valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Form.Item>
            {rewardEnabled && (
              <Form.Item label="Điểm thưởng" name={["rewardConfig", "points"]} rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
