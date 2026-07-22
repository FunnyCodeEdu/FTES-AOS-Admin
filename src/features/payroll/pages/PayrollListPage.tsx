import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { EyeOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { Modal } from "antd";

import { Can } from "../../../shared/permissions";
import { usePayrollList, useUpdateStatus } from "../api/payroll.api";
import type { Earning, EarningStatus, PayrollListParams } from "../types";
import {
  STATUS_LABEL,
  STATUS_OPTIONS,
  formatDate,
  formatVnd,
  statusOptionsFor,
  statusTagColor,
} from "../format";
import { PayrollDetailDrawer } from "../components/PayrollDetailDrawer";

function parseParams(searchParams: URLSearchParams): PayrollListParams {
  return {
    q: searchParams.get("q") || undefined,
    status: (searchParams.get("status") as EarningStatus) || undefined,
  };
}

function buildSearchParams(values: PayrollListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (values.q) params.set("q", values.q);
  if (values.status) params.set("status", values.status);
  return params;
}

/**
 * Điều khiển đổi trạng thái ở từng dòng (mark-paid). Là component riêng để mỗi dòng có
 * mutation gắn đúng `id` (hook không gọi trong vòng lặp map cột được). Bọc `<Can>` ở cột.
 */
function RowStatusControl({ earning }: { earning: Earning }) {
  const updateStatus = useUpdateStatus(earning.id);

  const handleChange = (status: EarningStatus) => {
    if (status === earning.status) return;
    const commit = () =>
      updateStatus.mutate(
        { status },
        { onSuccess: () => message.success(`Đã chuyển trạng thái sang ${status}`) }
      );
    if (status === "CLOSE") {
      Modal.confirm({
        title: "Xác nhận chốt kỳ lương (đã chi trả)?",
        content:
          "Chuyển sang CLOSE sẽ ghi nhận kỳ lương đã được chi trả và KHÔNG thể hoàn tác. Bạn chắc chắn?",
        okText: "Chốt & đánh dấu đã trả",
        okType: "danger",
        cancelText: "Huỷ",
        onOk: commit,
      });
      return;
    }
    commit();
  };

  return (
    <Select
      size="small"
      value={earning.status}
      style={{ width: 120 }}
      options={statusOptionsFor(earning.status)}
      loading={updateStatus.isPending}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function PayrollListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const { data, isLoading, isError, error, refetch, isFetching } = usePayrollList();

  const [detailEarning, setDetailEarning] = useState<Earning | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rows = data ?? [];

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        // Ngân sách còn phải chi = các kỳ chưa chốt (OPEN + PENDING). CLOSE đã chi trả xong,
        // đếm riêng ở card "Đã chi trả" nên không gộp vào budget để tránh trùng/thổi phồng.
        if (r.status !== "CLOSE") acc.budget += r.netPayable;
        if (r.status === "CLOSE") acc.paid += r.netPayable;
        if (r.status === "PENDING") acc.pending += r.netPayable;
        return acc;
      },
      { budget: 0, paid: 0, pending: 0 }
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = (params.q ?? "").trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ = q
        ? (r.instructorName ?? "").toLowerCase().includes(q) ||
          (r.instructorId ?? "").toLowerCase().includes(q)
        : true;
      const matchesStatus = params.status ? r.status === params.status : true;
      return matchesQ && matchesStatus;
    });
  }, [rows, params.q, params.status]);

  const hasFilters = Boolean(params.q || params.status);

  const openDetail = (earning: Earning) => {
    setDetailEarning(earning);
    setDrawerOpen(true);
  };

  const columns: ColumnsType<Earning> = [
    {
      title: "STT",
      key: "index",
      width: 60,
      render: (_v, _r, index) => index + 1,
    },
    {
      title: "Giảng viên",
      dataIndex: "instructorName",
      key: "instructorName",
      sorter: (a, b) => (a.instructorName ?? "").localeCompare(b.instructorName ?? ""),
    },
    {
      title: "Doanh thu gộp",
      dataIndex: "grossRevenue",
      key: "grossRevenue",
      align: "right",
      render: (v: number) => formatVnd(v),
      sorter: (a, b) => a.grossRevenue - b.grossRevenue,
    },
    {
      title: "Phụ cấp",
      dataIndex: "allowance",
      key: "allowance",
      align: "right",
      render: (v: number) => formatVnd(v),
    },
    {
      title: "Tổng trừ",
      dataIndex: "totalDeduction",
      key: "totalDeduction",
      align: "right",
      render: (v: number) => formatVnd(v),
    },
    {
      title: "Thực nhận",
      dataIndex: "netPayable",
      key: "netPayable",
      align: "right",
      render: (v: number) => <strong>{formatVnd(v)}</strong>,
      sorter: (a, b) => a.netPayable - b.netPayable,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => formatDate(v),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: EarningStatus) => (
        <Tag color={statusTagColor(status)}>{STATUS_LABEL[status]}</Tag>
      ),
    },
    {
      title: "Hiệu lực",
      dataIndex: "active",
      key: "active",
      align: "center",
      render: (active: boolean) => (active ? "Có" : "Không"),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 200,
      render: (_v, record) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            Chi tiết
          </Button>
          <Can permissions={["payroll.manage"]}>
            <RowStatusControl earning={record} />
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Lương giảng viên</Typography.Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Ngân sách còn phải chi"
              value={stats.budget}
              valueStyle={{ color: "#3f8600" }}
              formatter={(v) => formatVnd(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Đã chi trả"
              value={stats.paid}
              valueStyle={{ color: "#cf1322" }}
              formatter={(v) => formatVnd(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Đang chờ duyệt"
              value={stats.pending}
              valueStyle={{ color: "#faad14" }}
              formatter={(v) => formatVnd(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Tổng giảng viên"
              // Distinct instructor: 1 giảng viên có thể có NHIỀU kỳ lương (rows) sau payout →
              // rows.length thổi phồng. Đếm theo instructorId duy nhất.
              value={new Set(rows.map((r) => r.instructorId).filter(Boolean)).size}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Input
                allowClear
                placeholder="Tìm theo tên giảng viên"
                prefix={<SearchOutlined />}
                style={{ width: 260 }}
                defaultValue={params.q}
                onChange={(e) =>
                  setSearchParams(buildSearchParams({ ...params, q: e.target.value || undefined }))
                }
              />
              <Select
                allowClear
                placeholder="Trạng thái"
                style={{ minWidth: 160 }}
                value={params.status}
                options={STATUS_OPTIONS}
                onChange={(value) =>
                  setSearchParams(buildSearchParams({ ...params, status: value || undefined }))
                }
              />
            </Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Làm mới
            </Button>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách lương"
              description={error?.message}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {isLoading && !data ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : filteredRows.length === 0 ? (
            <Empty
              description={hasFilters ? "Không có kỳ lương phù hợp" : "Chưa có dữ liệu lương"}
            >
              {hasFilters && (
                <Button onClick={() => setSearchParams(new URLSearchParams())}>Xoá filter</Button>
              )}
            </Empty>
          ) : (
            <Table
              rowKey="id"
              columns={columns}
              dataSource={filteredRows}
              loading={isFetching}
              onRow={(record) => ({ onClick: () => openDetail(record) })}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} kỳ lương`,
              }}
            />
          )}
        </Space>
      </Card>

      <PayrollDetailDrawer
        open={drawerOpen}
        earning={detailEarning}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
