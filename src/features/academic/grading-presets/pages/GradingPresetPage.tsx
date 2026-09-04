import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, ImportOutlined, ReloadOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { Can } from "../../../../shared/permissions";
import { useSubjects } from "../../subjects/api/subjects.api";
import {
  useApplyGradingPreset,
  useDeleteGradingPreset,
  useGradingPresets,
  useImportGradingPresets,
} from "../api/gradingPresets.api";
import { parsePresetJson } from "../presetImport";
import type { GradingPresetView } from "../types";

const MANAGE_PERMISSIONS = ["admin.challenge.manage"];

const SAMPLE = `{
  "name": "LAB211 — chấm chặt phần validate",
  "teacherName": "Thầy Nguyễn Văn A",
  "subjectCode": "LAB211",
  "rubrics": [
    { "criterion": "Đúng đặc tả chức năng", "maxScore": 40, "description": "Chạy đúng mọi chức năng đề yêu cầu" },
    { "criterion": "Thiết kế hướng đối tượng", "maxScore": 25, "description": "Tách lớp hợp lý, không dồn vào main()" },
    { "criterion": "Kiểm tra dữ liệu vào", "maxScore": 20, "description": "Validate và cho nhập lại thay vì để chết" },
    { "criterion": "Chất lượng mã nguồn", "maxScore": 15, "description": "Tên rõ nghĩa, không lặp code" }
  ]
}`;

/**
 * **Thang chấm theo giảng viên** — kho bộ tiêu chí sưu tầm được, và chỗ áp chúng lên đề.
 *
 * <p>Áp một bộ là GHI ĐÈ: `grading_config.criteria` (thứ model đọc) + toàn bộ `challenge.rubrics`
 * (thứ học viên thấy) của mọi đề trong phạm vi. Sau lượt áp, đề đứng độc lập — sửa bộ tiêu chí về
 * sau KHÔNG đổi đề nào cho tới lượt áp kế tiếp. Vì thế nút áp hỏi xác nhận kèm SỐ ĐỀ bị chạm.
 */
export default function GradingPresetPage() {
  const [q, setQ] = useState("");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [applying, setApplying] = useState<GradingPresetView | null>(null);
  const [applySubject, setApplySubject] = useState<string | undefined>();
  const [applyTag, setApplyTag] = useState<string | undefined>("pe");

  const presets = useGradingPresets({ subjectId, q });
  const subjects = useSubjects({ page: 1, pageSize: 1000 });
  const importMutation = useImportGradingPresets();
  const applyMutation = useApplyGradingPreset();
  const deleteMutation = useDeleteGradingPreset();

  const subjectOptions = useMemo(
    () =>
      (subjects.data?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.code} — ${s.name}`,
      })),
    [subjects.data],
  );

  const runImport = async () => {
    let items;
    try {
      items = parsePresetJson(importText);
    } catch (e) {
      // Lỗi định dạng là lỗi của NỘI DUNG DÁN VÀO, không phải của server — hiện tại chỗ, giữ
      // nguyên ô nhập để người dùng sửa chứ không đóng modal.
      message.error(e instanceof Error ? e.message : "Không đọc được nội dung");
      return;
    }
    try {
      const saved = await importMutation.mutateAsync(items);
      message.success(`Đã import ${saved.length} bộ tiêu chí`);
      setImportOpen(false);
      setImportText("");
    } catch (e) {
      message.error(adminErrorMessage(e));
    }
  };

  const runApply = async () => {
    if (!applying) return;
    if (!applySubject) {
      message.error("Chọn môn để áp thang chấm");
      return;
    }
    try {
      const result = await applyMutation.mutateAsync({
        id: applying.id,
        body: { subjectId: applySubject, tagSlug: applyTag || undefined },
      });
      message.success(
        result.applied === 0
          ? "Không có đề nào khớp phạm vi đã chọn"
          : `Đã áp thang chấm cho ${result.applied} đề`,
      );
      setApplying(null);
    } catch (e) {
      message.error(adminErrorMessage(e));
    }
  };

  const confirmDelete = (row: GradingPresetView) => {
    Modal.confirm({
      title: `Xoá bộ tiêu chí "${row.name}"?`,
      // Nói rõ điều KHÔNG xảy ra: người dùng dễ tưởng xoá bộ là gỡ thang chấm khỏi đề.
      content:
        "Các đề đã áp bộ này giữ nguyên thang chấm hiện tại — xoá ở đây chỉ gỡ bộ khỏi kho, "
        + "không đụng tới đề nào.",
      okText: "Xoá",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(row.id);
          message.success("Đã xoá");
        } catch (e) {
          message.error(adminErrorMessage(e));
        }
      },
    });
  };

  const columns = [
    {
      title: "Giảng viên",
      dataIndex: "teacherName",
      render: (v: string, row: GradingPresetView) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{v}</Typography.Text>
          <Typography.Text type="secondary">{row.name}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Môn",
      dataIndex: "subjectCode",
      width: 120,
      render: (v: string | null) => (v ? <Tag>{v}</Tag> : <Tag color="default">Dùng chung</Tag>),
    },
    {
      title: "Tiêu chí",
      dataIndex: "rubrics",
      width: 110,
      render: (rubrics: GradingPresetView["rubrics"]) => `${rubrics?.length ?? 0} dòng`,
    },
    {
      title: "Thang điểm",
      dataIndex: "totalScore",
      width: 110,
      render: (v: number | null) => (v == null ? "—" : v),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (v: GradingPresetView["status"]) => (
        <Tag color={v === "ACTIVE" ? "green" : v === "DRAFT" ? "gold" : "default"}>{v}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 200,
      render: (_: unknown, row: GradingPresetView) => (
        <Can permissions={MANAGE_PERMISSIONS}>
          <Space>
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setApplying(row);
                setApplySubject(row.subjectId ?? subjectId);
                setApplyTag("pe");
              }}
            >
              Áp cho môn
            </Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(row)} />
          </Space>
        </Can>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Card
        title="Thang chấm theo giảng viên"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => presets.refetch()}>
              Tải lại
            </Button>
            <Can permissions={MANAGE_PERMISSIONS}>
              <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
                Import bộ tiêu chí
              </Button>
            </Can>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Áp một bộ tiêu chí là ghi đè thang chấm của đề"
          description={
            "Thang chấm được chép sang từng đề: model chấm theo bản đã chép, nên sửa bộ tiêu chí "
            + "sau đó không làm đổi điểm của bài đã nộp. Muốn đề dùng thang mới thì áp lại."
          }
        />
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            allowClear
            placeholder="Tìm theo giảng viên hoặc tên bộ"
            style={{ width: 280 }}
            onSearch={setQ}
            onChange={(e) => !e.target.value && setQ("")}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Lọc theo môn"
            style={{ width: 280 }}
            options={subjectOptions}
            value={subjectId}
            onChange={setSubjectId}
          />
        </Space>

        {presets.isLoading ? (
          <Skeleton active />
        ) : presets.error ? (
          <Alert type="error" showIcon message={adminErrorMessage(presets.error)} />
        ) : (presets.data ?? []).length === 0 ? (
          <Empty description="Chưa có bộ tiêu chí nào — bấm Import để nạp bộ đầu tiên" />
        ) : (
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={presets.data}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            expandable={{
              expandedRowRender: (row: GradingPresetView) => (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>
                    {row.criteria}
                  </Typography.Paragraph>
                  <Table
                    rowKey="orderNo"
                    size="small"
                    pagination={false}
                    dataSource={row.rubrics}
                    columns={[
                      { title: "#", dataIndex: "orderNo", width: 50 },
                      { title: "Tiêu chí", dataIndex: "criterion" },
                      { title: "Mô tả", dataIndex: "description" },
                      { title: "Điểm tối đa", dataIndex: "maxScore", width: 110 },
                    ]}
                  />
                </Space>
              ),
            }}
          />
        )}
      </Card>

      <Modal
        open={importOpen}
        title="Import bộ tiêu chí chấm"
        okText="Import"
        cancelText="Huỷ"
        confirmLoading={importMutation.isPending}
        onOk={runImport}
        onCancel={() => setImportOpen(false)}
        width={720}
      >
        <Typography.Paragraph type="secondary">
          Dán JSON của một bộ, hoặc một mảng nhiều bộ. Chấp nhận cả <code>maxScore</code> lẫn{" "}
          <code>max_score</code>. Thiếu <code>criteria</code> thì hệ thống tự dựng từ bảng tiêu chí.
          Import lại cùng giảng viên và cùng tên bộ là cập nhật, không tạo bản thứ hai.
        </Typography.Paragraph>
        <Input.TextArea
          rows={16}
          value={importText}
          placeholder={SAMPLE}
          onChange={(e) => setImportText(e.target.value)}
          style={{ fontFamily: "monospace", fontSize: 12 }}
        />
        <Button size="small" style={{ marginTop: 8 }} onClick={() => setImportText(SAMPLE)}>
          Điền mẫu
        </Button>
      </Modal>

      <Modal
        open={Boolean(applying)}
        title={`Áp thang chấm: ${applying?.teacherName ?? ""} — ${applying?.name ?? ""}`}
        okText="Áp thang chấm"
        cancelText="Huỷ"
        confirmLoading={applyMutation.isPending}
        onOk={runApply}
        onCancel={() => setApplying(null)}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert
            type="warning"
            showIcon
            message="Ghi đè thang chấm hiện tại của mọi đề trong phạm vi đã chọn"
          />
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Chọn môn"
            style={{ width: "100%" }}
            options={subjectOptions}
            value={applySubject}
            onChange={setApplySubject}
          />
          <Select
            allowClear
            placeholder="Lọc theo tag (bỏ trống = cả môn)"
            style={{ width: "100%" }}
            options={[
              { value: "pe", label: "Chỉ đề PE (tag pe)" },
              { value: "lab211", label: "Chỉ đề LAB211 (tag lab211)" },
            ]}
            value={applyTag}
            onChange={setApplyTag}
          />
        </Space>
      </Modal>
    </Space>
  );
}
