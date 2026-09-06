import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CopyOutlined, DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { useCourses, useCoursePackages } from "../../courses/api/courses.api";
import { useStudentEmails } from "../api/studentEmails.api";
import { buildEmailCsv, uniqueEmails } from "../emailCsv";
import type { EnrollStatusFilter, StudentEmailQuery, StudentEmailRow } from "../types";

function downloadCsv(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const STATUS_OPTIONS: Array<{ value: EnrollStatusFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "ACTIVE", label: "Đang học" },
  { value: "INACTIVE", label: "Đã dừng / hết kỳ" },
];

/**
 * **Xuất mail học viên** (`/academic/student-emails`).
 *
 * <p>Thay cho cách cũ: mở từng khoá, vào tab Học viên, copy tay. Ở đây lọc được theo nhiều khoá,
 * theo gói, theo đang học / đã dừng, và theo khoảng ngày tham gia.
 *
 * <p><b>Chỉ gọi API khi bấm "Lọc".</b> Bỏ trống hết là "mọi khoá, mọi thời điểm" — tự chạy lúc mở
 * màn sẽ kéo cả chục nghìn dòng mà chẳng ai cần.
 */
export default function StudentEmailExportPage() {
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [packageIds, setPackageIds] = useState<string[]>([]);
  const [status, setStatus] = useState<EnrollStatusFilter>("ACTIVE");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [applied, setApplied] = useState<StudentEmailQuery | null>(null);

  const courses = useCourses({ page: 1, pageSize: 1000 });
  // Ô chọn gói chỉ có nghĩa khi đã chọn ĐÚNG MỘT khoá: gói thuộc về khoá, gộp gói của nhiều khoá
  // vào một danh sách thì hai gói trùng tên ("Gói Zoom") không phân biệt được là của khoá nào.
  const onlyCourseId = courseIds.length === 1 ? courseIds[0] : undefined;
  const packages = useCoursePackages(onlyCourseId);

  const query = useStudentEmails(applied ?? {}, applied !== null);

  const courseOptions = useMemo(
    () =>
      (courses.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    [courses.data],
  );

  const packageOptions = useMemo(
    () => (packages.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    [packages.data],
  );

  const handleSearch = () => {
    setApplied({
      courseIds,
      packageIds,
      status,
      // `to` là mốc KHÔNG bao gồm, nên cộng thêm một ngày: người dùng chọn "đến 31/08" là có ý gồm
      // cả ngày 31, chứ không phải cắt lúc 00:00 sáng hôm đó.
      from: range?.[0] ? range[0].startOf("day").toISOString() : undefined,
      to: range?.[1] ? range[1].add(1, "day").startOf("day").toISOString() : undefined,
    });
  };

  const rows = query.data?.rows ?? [];
  const emails = useMemo(() => uniqueEmails(rows), [rows]);

  const handleCopy = async () => {
    if (emails.length === 0) return;
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      message.success(`Đã copy ${emails.length} email`);
    } catch {
      // Clipboard API cần ngữ cảnh bảo mật + quyền; trình duyệt từ chối là ca có thật.
      message.error("Trình duyệt không cho copy — dùng nút Tải CSV");
    }
  };

  const columns: ColumnsType<StudentEmailRow> = [
    { title: "Email", dataIndex: "email", width: 260 },
    { title: "Học viên", dataIndex: "username", width: 160 },
    {
      title: "Khoá",
      dataIndex: "courseTitle",
      render: (title: string, r) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{title}</Typography.Text>
          {r.courseCode ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {r.courseCode}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Gói",
      dataIndex: "packageName",
      width: 150,
      render: (name: string | null) =>
        name ? <Tag>{name}</Tag> : <Typography.Text type="secondary">Ghi danh thẳng</Typography.Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "active",
      width: 110,
      render: (active: boolean) =>
        active ? <Tag color="green">Đang học</Tag> : <Tag>Đã dừng</Tag>,
    },
    {
      title: "Tham gia",
      dataIndex: "joinedAt",
      width: 120,
      render: (iso: string | null) => (iso ? dayjs(iso).format("DD/MM/YYYY") : "—"),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Xuất mail học viên"
        description="Lọc theo khoá, gói, trạng thái và khoảng thời gian tham gia — rồi copy hoặc tải CSV."
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={12} style={{ width: "100%" }}>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Khoá học (bỏ trống = tất cả)"
            style={{ minWidth: 320 }}
            maxTagCount="responsive"
            options={courseOptions}
            loading={courses.isLoading}
            value={courseIds}
            onChange={(v) => {
              setCourseIds(v);
              // Gói vừa chọn thuộc khoá cũ — giữ lại sẽ lọc ra rỗng mà không nói vì sao.
              setPackageIds([]);
            }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder={
              onlyCourseId ? "Gói (bỏ trống = mọi gói)" : "Chọn đúng 1 khoá để lọc theo gói"
            }
            style={{ minWidth: 260 }}
            maxTagCount="responsive"
            options={packageOptions}
            disabled={!onlyCourseId}
            loading={packages.isLoading}
            value={packageIds}
            onChange={setPackageIds}
          />
          <Select
            style={{ width: 180 }}
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
          />
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            placeholder={["Từ ngày", "Đến ngày"]}
            value={range as never}
            onChange={(v) => setRange(v as [Dayjs | null, Dayjs | null] | null)}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={query.isFetching}
            onClick={handleSearch}
          >
            Lọc
          </Button>
        </Space>

        {packageIds.length > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 12 }}
            message="Lọc theo gói chỉ trả về người MUA GÓI"
            description={
              "Ghi danh thẳng (khoá LEGACY, cấp tay, khoá 0đ) không mang thông tin gói, nên không "
              + "nằm trong kết quả khi bạn chọn gói."
            }
          />
        )}
      </Card>

      {applied === null ? (
        <Card>
          <Empty description="Chọn bộ lọc rồi bấm “Lọc” để xem danh sách." />
        </Card>
      ) : query.isLoading ? (
        <Card>
          <Skeleton active />
        </Card>
      ) : query.error ? (
        <Alert type="error" showIcon message={adminErrorMessage(query.error)} />
      ) : (
        <Card
          size="small"
          title={
            <Space size={32}>
              <Statistic title="Số dòng" value={query.data?.totalRows ?? 0} />
              <Statistic
                title="Người nhận thư"
                value={query.data?.distinctEmails ?? 0}
                valueStyle={{ color: "#3f8600" }}
              />
            </Space>
          }
          extra={
            <Space>
              <Button icon={<CopyOutlined />} disabled={emails.length === 0} onClick={handleCopy}>
                Copy {emails.length} email
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                disabled={rows.length === 0}
                onClick={() =>
                  downloadCsv(
                    buildEmailCsv(rows),
                    `mail-hoc-vien-${dayjs().format("YYYYMMDD-HHmm")}.csv`,
                  )
                }
              >
                Tải CSV
              </Button>
            </Space>
          }
        >
          {query.data?.truncated && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="Danh sách đã bị cắt bớt"
              description={
                "Kết quả vượt trần một lượt xuất nên đây là bản THIẾU. Thu hẹp bộ lọc (chọn ít khoá "
                + "hơn, hoặc chia nhỏ khoảng ngày) rồi xuất làm nhiều lượt."
              }
            />
          )}
          {rows.length === 0 ? (
            <Empty description="Không có học viên nào khớp bộ lọc." />
          ) : (
            <Table
              rowKey={(r) => `${r.userId}-${r.courseId}-${r.packageId ?? "none"}`}
              size="small"
              columns={columns}
              dataSource={rows}
              scroll={{ x: 900 }}
              pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `${t} dòng` }}
            />
          )}
        </Card>
      )}
    </div>
  );
}
