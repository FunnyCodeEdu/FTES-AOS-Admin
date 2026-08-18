import { useEffect, useState } from "react";
import { Alert, DatePicker, Form, Input, InputNumber, Modal, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useUpsertXpMultiplierEvent } from "../api/gamification.api";
import type { XpMultiplierEvent } from "../api/gamification.api";

const { RangePicker } = DatePicker;

interface XpMultiplierEventFormModalProps {
  open: boolean;
  /** null = tạo mới. Sự kiện ĐANG BẬT không mở được form này (BE cũng từ chối). */
  event?: XpMultiplierEvent | null;
  /** Trần hệ số BE đang cấu hình — hiện lên và chặn sớm; BE vẫn là nơi từ chối thật. */
  maxMultiplier: number;
  onClose: () => void;
}

interface FormValues {
  code: string;
  title: string;
  multiplier: number;
  range: [Dayjs, Dayjs];
}

/**
 * Hệ số vượt trần chưa? Trần đến từ BE (biến môi trường `FTES_GAMIFICATION_MULTIPLIER_MAX`), KHÔNG
 * phải hằng số của FE — hằng số ở đây sẽ lệch trần thật ngay lần đầu ai đó đổi env, và lệch theo
 * hướng nguy hiểm nhất là FE cho qua còn BE mới chặn.
 *
 * Pure — unit test.
 */
export function isMultiplierOverMax(value: number | null | undefined, max: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > max;
}

/**
 * Modal tạo/sửa sự kiện nhân hệ số. Lưu ở đây LUÔN ra bản NHÁP (tắt) — BE không nhận field
 * `active` trong body. Bật là một bước riêng có xác nhận, vì XP đã cấp không rút lại được.
 */
export function XpMultiplierEventFormModal({
  open,
  event,
  maxMultiplier,
  onClose,
}: XpMultiplierEventFormModalProps) {
  const upsert = useUpsertXpMultiplierEvent();
  const [form] = Form.useForm<FormValues>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!event;

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (event) {
      form.setFieldsValue({
        code: event.code,
        title: event.title,
        multiplier: event.multiplier,
        range: [dayjs(event.startsAt), dayjs(event.endsAt)],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ multiplier: 2 });
    }
  }, [open, event, form]);

  function handleSubmit() {
    setSubmitError(null);
    form.validateFields().then((values) => {
      const [start, end] = values.range;
      upsert.mutate(
        {
          code: values.code.trim(),
          title: values.title.trim(),
          multiplier: values.multiplier,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        },
        {
          onSuccess: () => {
            message.success(isEdit ? "Đã lưu sự kiện (vẫn đang TẮT)" : "Đã tạo sự kiện (đang TẮT)");
            onClose();
          },
          // handleAdminMutationError đã hiện notification kèm ĐÚNG lý do của BE; nhắc lại trong
          // modal để người đang gõ không phải nhìn sang góc màn hình.
          onError: (err) => setSubmitError(err.message),
        }
      );
    });
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Sửa sự kiện ${event?.code}` : "Tạo sự kiện nhân hệ số XP"}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={upsert.isPending}
      okText="Lưu (chưa bật)"
      cancelText="Huỷ"
      destroyOnClose
      width={560}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Lưu KHÔNG bật sự kiện"
        description={
          <>
            Sự kiện lưu xong vẫn ở trạng thái <strong>TẮT</strong>. Bật là thao tác riêng, phải xác
            nhận lại hệ số và khung thời gian — vì XP đã cấp nằm vĩnh viễn trong sổ, tắt sự kiện
            không rút lại được.
          </>
        }
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="Mã sự kiện (code)"
          rules={[
            { required: true, message: "Bắt buộc" },
            { max: 64, message: "Tối đa 64 ký tự" },
          ]}
          extra="VD: CAY-QUEST-T1. Sửa sự kiện đã có = nhập lại đúng mã này."
        >
          <Input placeholder="VD: CAY-QUEST-T1" disabled={isEdit} />
        </Form.Item>
        <Form.Item
          name="title"
          label="Tên hiển thị"
          rules={[
            { required: true, message: "Bắt buộc" },
            { max: 128, message: "Tối đa 128 ký tự" },
          ]}
        >
          <Input placeholder="VD: Tuần lễ cày quest tháng 1" />
        </Form.Item>
        <Form.Item
          name="multiplier"
          label="Hệ số nhân XP"
          rules={[
            { required: true, message: "Bắt buộc" },
            {
              validator: (_, value: number) =>
                isMultiplierOverMax(value, maxMultiplier)
                  ? Promise.reject(
                      new Error(
                        `Hệ số tối đa hiện tại là x${maxMultiplier}. XP đã cấp KHÔNG rút lại được nên hệ số vượt trần bị từ chối.`
                      )
                    )
                  : Promise.resolve(),
            },
          ]}
          extra={`Nhận số lẻ (x1.5). Trần hiện tại: x${maxMultiplier}. Hệ số nhân cả XP lẫn trần XP mỗi ngày.`}
        >
          <InputNumber min={1} max={maxMultiplier} step={0.5} precision={2} style={{ width: 180 }} />
        </Form.Item>
        <Form.Item
          name="range"
          label="Khung thời gian (bắt đầu — kết thúc)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Hoạt động xảy ra TRONG khung này được nhân, kể cả khi hệ thống xử lý muộn."
        >
          <RangePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        {submitError && (
          <Alert type="error" showIcon message={submitError} style={{ marginTop: 8 }} />
        )}
      </Form>
    </Modal>
  );
}
