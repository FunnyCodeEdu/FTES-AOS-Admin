import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { EyeInvisibleOutlined, EyeOutlined, PushpinOutlined, ReloadOutlined, SearchOutlined, StarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Can } from "../../../shared/permissions";
import { usePosts, useTogglePostFeature, useTogglePostHide, useTogglePostPin } from "../api/community.api";
import type { Post, PostStatus } from "../shared/types";
import type { TableProps } from "antd";

const STATUS_OPTIONS: { label: string; value: PostStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Hidden", value: "hidden" },
  { label: "Pending", value: "pending" },
];

export default function PostsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [hideTarget, setHideTarget] = useState<Post | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [unhideTarget, setUnhideTarget] = useState<Post | null>(null);
  const [pinTarget, setPinTarget] = useState<Post | null>(null);
  const [featureTarget, setFeatureTarget] = useState<Post | null>(null);

  const status = (searchParams.get("status") as PostStatus | undefined) ?? undefined;
  const pinned = searchParams.get("pinned") === "true" ? true : undefined;
  const featured = searchParams.get("featured") === "true" ? true : undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = usePosts({
    status,
    pinned,
    featured,
    search: searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });
  const togglePin = useTogglePostPin();
  const toggleFeature = useTogglePostFeature();
  const toggleHide = useTogglePostHide();

  function updateParams(next: Record<string, string | number | boolean | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  function handleHide() {
    if (!hideTarget) return;
    if (!hideReason.trim()) {
      message.error("Vui lòng nhập lý do ẩn");
      return;
    }
    toggleHide.mutate(
      { id: hideTarget.id, hide: true, reason: hideReason.trim() },
      {
        onSuccess: () => {
          message.success("Đã ẩn post");
          setHideTarget(null);
          setHideReason("");
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleUnhide() {
    if (!unhideTarget) return;
    toggleHide.mutate(
      { id: unhideTarget.id, hide: false },
      {
        onSuccess: () => {
          message.success("Đã bỏ ẩn post");
          setUnhideTarget(null);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handlePin() {
    if (!pinTarget) return;
    togglePin.mutate(pinTarget.id, {
      onSuccess: () => {
        message.success(pinTarget.pinned ? "Đã bỏ ghim post" : "Đã ghim post");
        setPinTarget(null);
      },
      onError: (err) => message.error(err.message),
    });
  }

  function handleFeature() {
    if (!featureTarget) return;
    toggleFeature.mutate(featureTarget.id, {
      onSuccess: () => {
        message.success(featureTarget.featured ? "Đã bỏ nổi bật post" : "Đã đánh dấu nổi bật");
        setFeatureTarget(null);
      },
      onError: (err) => message.error(err.message),
    });
  }

  const columns: TableProps<Post>["columns"] = [
    { title: "Tiêu đề", dataIndex: "title" },
    { title: "Tác giả", dataIndex: "authorName" },
    { title: "Group", dataIndex: "groupName" },
    { title: "Trạng thái", dataIndex: "status", render: (s: PostStatus) => <Tag>{s}</Tag> },
    { title: "Pin", dataIndex: "pinned", render: (v: boolean) => (v ? <Tag color="blue">Pinned</Tag> : null) },
    { title: "Feature", dataIndex: "featured", render: (v: boolean) => (v ? <Tag color="gold">Featured</Tag> : null) },
    { title: "Ngày tạo", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
    {
      title: "Thao tác",
      render: (_: unknown, record: Post) => (
        <Space>
          <Can permissions={["post.moderate"]}>
            <Button size="small" icon={<PushpinOutlined />} onClick={() => setPinTarget(record)}>
              {record.pinned ? "Unpin" : "Pin"}
            </Button>
          </Can>
          <Can permissions={["post.moderate"]}>
            <Button size="small" icon={<StarOutlined />} onClick={() => setFeatureTarget(record)}>
              {record.featured ? "Unfeature" : "Feature"}
            </Button>
          </Can>
          <Can permissions={["post.moderate"]}>
            {record.status === "hidden" ? (
              <Button size="small" icon={<EyeOutlined />} onClick={() => setUnhideTarget(record)}>
                Unhide
              </Button>
            ) : (
              <Button size="small" icon={<EyeInvisibleOutlined />} danger onClick={() => { setHideTarget(record); setHideReason(""); }}>
                Hide
              </Button>
            )}
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Community Posts</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm tiêu đề/tác giả"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => updateParams({ search: search || undefined, page: undefined })}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => updateParams({ status: value, page: undefined })}
            style={{ width: 140 }}
          />
          <Space>
            <Typography.Text>Pin</Typography.Text>
            <Switch checked={pinned === true} onChange={(v) => updateParams({ pinned: v || undefined, page: undefined })} />
          </Space>
          <Space>
            <Typography.Text>Feature</Typography.Text>
            <Switch checked={featured === true} onChange={(v) => updateParams({ featured: v || undefined, page: undefined })} />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải posts"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, ps) => updateParams({ page: p, pageSize: ps }),
        }}
      />

      <Modal
        open={!!hideTarget}
        title="Ẩn post"
        onOk={handleHide}
        onCancel={() => setHideTarget(null)}
        confirmLoading={toggleHide.isPending}
        okText="Ẩn"
        cancelText="Huỷ"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Post <strong>{hideTarget?.title}</strong> sẽ bị ẩn khỏi cộng đồng. Cần ghi lý do để audit.
          </Typography.Text>
          <Input.TextArea
            rows={3}
            value={hideReason}
            onChange={(e) => setHideReason(e.target.value)}
            placeholder="Lý do ẩn (bắt buộc)"
          />
        </Space>
      </Modal>

      <Modal
        open={!!unhideTarget}
        title="Bỏ ẩn post"
        onOk={handleUnhide}
        onCancel={() => setUnhideTarget(null)}
        confirmLoading={toggleHide.isPending}
        okText="Bỏ ẩn"
        cancelText="Huỷ"
      >
        <Typography.Text>
          Post <strong>{unhideTarget?.title}</strong> sẽ hiển thị lại. Tiếp tục?
        </Typography.Text>
      </Modal>

      <Modal
        open={!!pinTarget}
        title={pinTarget?.pinned ? "Bỏ ghim post" : "Ghim post"}
        onOk={handlePin}
        onCancel={() => setPinTarget(null)}
        confirmLoading={togglePin.isPending}
        okText={pinTarget?.pinned ? "Bỏ ghim" : "Ghim"}
        cancelText="Huỷ"
      >
        <Typography.Text>
          {pinTarget?.pinned
            ? `Post "${pinTarget?.title}" sẽ bị bỏ ghim. Tiếp tục?`
            : `Post "${pinTarget?.title}" sẽ được ghim lên đầu danh sách. Tiếp tục?`}
        </Typography.Text>
      </Modal>

      <Modal
        open={!!featureTarget}
        title={featureTarget?.featured ? "Bỏ nổi bật post" : "Đánh dấu nổi bật"}
        onOk={handleFeature}
        onCancel={() => setFeatureTarget(null)}
        confirmLoading={toggleFeature.isPending}
        okText={featureTarget?.featured ? "Bỏ nổi bật" : "Nổi bật"}
        cancelText="Huỷ"
      >
        <Typography.Text>
          {featureTarget?.featured
            ? `Post "${featureTarget?.title}" sẽ không còn được đẩy lên community surfaces. Tiếp tục?`
            : `Post "${featureTarget?.title}" sẽ được đẩy lên community surfaces. Tiếp tục?`}
        </Typography.Text>
      </Modal>
    </div>
  );
}
