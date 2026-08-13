import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  InputNumber,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { LockOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import {
  useLockForDeviceSharing,
  useMultiDeviceAccounts,
  type MultiDeviceAccount,
} from "../api/deviceOversight.api";

const DEFAULT_MIN_DEVICES = 4;
const DEFAULT_WINDOW_DAYS = 30;
const PAGE_SIZE = 20;

/** Chip "đã vi phạm N lần" — 0 lần thì KHÔNG hiện gì (im lặng là trạng thái sạch). */
function ViolationTag({ count }: { count: number }) {
  if (count <= 0) return <Typography.Text type="secondary">—</Typography.Text>;
  return (
    <Tag color={count >= 2 ? "red" : "orange"}>
      Đã vi phạm {count} lần
    </Tag>
  );
}

/**
 * Bảng theo dõi tài khoản dùng chung: liệt kê tài khoản đăng nhập từ nhiều thiết bị PHÂN BIỆT
 * trong một cửa sổ ngày, để admin quyết định có khoá hay không.
 *
 * <b>Trang này KHÔNG tự khoá ai.</b> Fingerprint có thể trùng thật (máy phòng lab dựng từ cùng
 * một image, trình duyệt bật chống fingerprint, cùng một model điện thoại), nên một cú tự động sẽ
 * chặn đúng người đã trả tiền ngay giữa buổi học. Hệ thống đưa bằng chứng — số thiết bị, tên
 * thiết bị, lần cuối thấy, số lần đã vi phạm — người quyết.
 *
 * Ngưỡng và cửa sổ chỉnh được ngay trên trang: 4 thiết bị / 30 ngày là mặc định đã chốt, nhưng
 * mùa thi hay đợt khuyến mãi có thể cần nới, và không ai muốn deploy lại để đổi một con số.
 */
export default function DeviceOversightPage() {
  const [minDevices, setMinDevices] = useState(DEFAULT_MIN_DEVICES);
  const [days, setDays] = useState(DEFAULT_WINDOW_DAYS);
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error, refetch, isFetching } = useMultiDeviceAccounts({
    minDevices,
    days,
    page,
    size: PAGE_SIZE,
  });
  const lockMutation = useLockForDeviceSharing();

  const confirmLock = (row: MultiDeviceAccount) => {
    Modal.confirm({
      title: `Khoá tài khoản ${row.username ?? row.email ?? row.userId}?`,
      icon: <LockOutlined />,
      width: 560,
      content: (
        <div>
          <p>
            Tài khoản này đăng nhập từ <strong>{row.deviceCount} thiết bị</strong> trong{" "}
            <strong>{days} ngày</strong> gần nhất
            {row.devices ? `: ${row.devices}` : ""}.
          </p>
          <p>
            Khoá sẽ <strong>đăng xuất mọi thiết bị ngay lập tức</strong> và gửi email báo cho chủ
            tài khoản. Lý do khoá do hệ thống soạn từ đúng các thiết bị trên, người bị khoá sẽ đọc
            được nó khi đăng nhập.
          </p>
          {row.violationCount > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`Tài khoản này đã bị khoá ${row.violationCount} lần trước đây.`}
            />
          )}
        </div>
      ),
      okText: "Khoá tài khoản",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        await lockMutation.mutateAsync({ userId: row.userId, windowDays: days });
        message.success("Đã khoá tài khoản và đăng xuất mọi thiết bị.");
      },
    });
  };

  const columns: TableProps<MultiDeviceAccount>["columns"] = [
    {
      title: "Tài khoản",
      key: "account",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Link to={`/users/${row.userId}`}>{row.username ?? "(chưa có username)"}</Link>
          <Typography.Text type="secondary">{row.email}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Thiết bị",
      dataIndex: "deviceCount",
      key: "deviceCount",
      width: 110,
      render: (count: number) => <Tag color={count >= 6 ? "red" : "gold"}>{count} thiết bị</Tag>,
    },
    {
      title: `Thiết bị gần nhất (${days} ngày)`,
      dataIndex: "devices",
      key: "devices",
      render: (devices: string) =>
        devices ? (
          <Tooltip title={devices}>
            <Typography.Text ellipsis style={{ maxWidth: 320 }}>
              {devices}
            </Typography.Text>
          </Tooltip>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Tiền sử",
      dataIndex: "violationCount",
      key: "violationCount",
      width: 150,
      render: (count: number) => <ViolationTag count={count} />,
    },
    {
      title: "Trạng thái",
      dataIndex: "locked",
      key: "locked",
      width: 120,
      render: (locked: boolean) =>
        locked ? <Tag color="red">Đang khoá</Tag> : <Tag color="green">Hoạt động</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, row) => (
        <Can permissions={["user.lock"]}>
          <Button
            danger
            size="small"
            icon={<LockOutlined />}
            disabled={row.locked}
            onClick={() => confirmLock(row)}
          >
            Khoá
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Typography.Title level={4} style={{ marginBottom: 0 }}>
        Tài khoản dùng chung
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Tài khoản đăng nhập từ nhiều thiết bị khác nhau trong cửa sổ thời gian. Thiết bị đã bị thu
        hồi và thiết bị không hoạt động trong cửa sổ không được tính.
      </Typography.Paragraph>

      <Card size="small">
        <Space wrap>
          <span>
            Từ{" "}
            <InputNumber
              min={2}
              max={50}
              value={minDevices}
              onChange={(v) => {
                setMinDevices(v ?? DEFAULT_MIN_DEVICES);
                setPage(0);
              }}
            />{" "}
            thiết bị trở lên
          </span>
          <span>
            trong{" "}
            <InputNumber
              min={1}
              max={365}
              value={days}
              onChange={(v) => {
                setDays(v ?? DEFAULT_WINDOW_DAYS);
                setPage(0);
              }}
            />{" "}
            ngày
          </span>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được danh sách"
          description={error?.message}
        />
      )}

      {isLoading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <Table<MultiDeviceAccount>
          rowKey="userId"
          columns={columns}
          dataSource={data?.items ?? []}
          locale={{
            emptyText: (
              <Empty
                description={`Không có tài khoản nào đăng nhập từ ${minDevices} thiết bị trở lên trong ${days} ngày.`}
              />
            ),
          }}
          pagination={{
            current: page + 1,
            pageSize: PAGE_SIZE,
            total: data?.totalElements ?? 0,
            showSizeChanger: false,
            onChange: (next) => setPage(next - 1),
          }}
        />
      )}
    </Space>
  );
}
