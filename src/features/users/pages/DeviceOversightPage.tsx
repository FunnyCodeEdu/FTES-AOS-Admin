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
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import {
  useLockForDeviceSharing,
  useMultiDeviceAccounts,
  type MultiDeviceAccount,
} from "../api/deviceOversight.api";

const DEFAULT_MIN_DEVICES = 2;
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

function accessSourceLabel(source: MultiDeviceAccount["accessSource"]) {
  if (source === "PAID_AND_ENROLLED") return "Đã mua";
  if (source === "PAID") return "Đã mua, chưa ghi danh";
  if (source === "ADMIN_ADDED") return "Admin thêm";
  return source === "ALL_USERS" ? "Toàn hệ thống" : "Ngoài phạm vi";
}

function riskMeta(row: MultiDeviceAccount) {
  if (
    row.deviceCount >= 10 ||
    row.ipCount >= 10 ||
    row.maxDevicesPerDay >= 6 ||
    row.rapidSwitches10m >= 2
  ) {
    return { color: "red", label: "Cần điều tra" };
  }
  if (
    row.deviceCount >= 6 ||
    row.ipCount >= 5 ||
    row.maxDevicesPerDay >= 3 ||
    row.rapidSwitches10m >= 1
  ) {
    return { color: "orange", label: "Theo dõi" };
  }
  return { color: "default", label: "Tín hiệu thấp" };
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
    currentTermOnly: true,
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
            Tài khoản có <strong>{row.deviceCount} fingerprint</strong>, tối đa{" "}
            <strong>{row.maxDevicesPerDay} fingerprint/ngày</strong>, <strong>{row.ipCount} IP</strong>
            {row.rapidSwitches10m > 0
              ? ` và ${row.rapidSwitches10m} lần đổi thiết bị trong 10 phút`
              : ""}.
          </p>
          <p>
            Thao tác này <strong>khóa tạm 24 giờ</strong>, đăng xuất mọi thiết bị và gửi
            thông báo cho chủ tài khoản. Hãy chỉ khóa sau khi đã xem nhiều tín hiệu;
            Chrome và Edge trên cùng máy có thể tạo hai fingerprint.
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
        await lockMutation.mutateAsync({
          userId: row.userId,
          windowDays: days,
          unlockAt: dayjs().add(24, "hour").toISOString(),
        });
        message.success("Đã khóa tạm tài khoản 24 giờ và đăng xuất mọi thiết bị.");
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
      title: "Quyền học kỳ này",
      key: "access",
      width: 165,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Tag color={row.accessSource === "ADMIN_ADDED" ? "blue" : "green"}>
            {accessSourceLabel(row.accessSource)}
          </Tag>
          <Typography.Text type="secondary">{row.courseCount} khóa</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Bằng chứng",
      key: "evidence",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Space wrap size={4}>
            <Tag>{row.deviceCount} fingerprint</Tag>
            <Tag>{row.maxDevicesPerDay}/ngày</Tag>
            <Tag>{row.ipCount} IP</Tag>
            {row.rapidSwitches10m > 0 && (
              <Tag color="orange">{row.rapidSwitches10m} đổi nhanh</Tag>
            )}
            {row.abnormalDays > 0 && <Tag>{row.abnormalDays} ngày bất thường</Tag>}
          </Space>
          {row.devices ? (
            <Tooltip title={row.devices}>
              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 420 }}>
                {row.devices}
              </Typography.Text>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Mức xem xét",
      key: "risk",
      width: 135,
      render: (_, row) => {
        const risk = riskMeta(row);
        return <Tag color={risk.color}>{risk.label}</Tag>;
      },
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
        Chỉ hiển thị người đã mua hoặc được thêm vào khóa của kỳ hiện tại. Danh
        sách cung cấp nhiều tín hiệu để admin xem xét; không tự kết luận chỉ từ fingerprint.
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
