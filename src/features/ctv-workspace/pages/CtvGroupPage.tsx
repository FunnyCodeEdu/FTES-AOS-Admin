import { useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Card, Input, Modal, Space, Table, Tag, Typography, message } from "antd";
import { usePosts, useReviewPost } from "../../community/api/community.api";
import { Can } from "../../../shared/permissions";
import { ScopeGuard } from "../components/ScopeGuard";
import type { Post, PostStatus } from "../../community/shared/types";
import type { TableProps } from "antd";

export default function CtvGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();

  return (
    <ScopeGuard scopeType="GROUP" scopeId={groupId ?? ""} permission="community.report.view">
      <CtvGroupContent groupId={groupId ?? ""} />
    </ScopeGuard>
  );
}

function CtvGroupContent({ groupId }: { groupId: string }) {
  const { data, isLoading, isError, error, refetch } = usePosts({ groupId, status: "pending" });
  const review = useReviewPost();
  const [rejectPost, setRejectPost] = useState<Post | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function handleApprove(post: Post) {
    review.mutate(
      { postId: post.id, decision: "approve", scopeId: groupId },
      {
        onSuccess: () => message.success("Đã duyệt bài viết"),
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleReject() {
    if (!rejectPost || !rejectReason.trim()) return;
    review.mutate(
      { postId: rejectPost.id, decision: "reject", scopeId: groupId, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          message.success("Đã từ chối bài viết");
          setRejectPost(null);
          setRejectReason("");
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  const columns: TableProps<Post>["columns"] = [
    { title: "Tiêu đề", dataIndex: "title" },
    { title: "Tác giả", dataIndex: "authorName" },
    { title: "Trạng thái", dataIndex: "status", render: (s: PostStatus) => <Tag>{s}</Tag> },
    {
      title: "Thao tác",
      render: (_: unknown, post: Post) => (
        <Can
          permissions={["post.moderate"]}
          scope={{ permission: "post.moderate", type: "GROUP", id: groupId }}
        >
          <Space>
            <Button size="small" type="primary" onClick={() => handleApprove(post)} loading={review.isPending}>
              Duyệt
            </Button>
            <Button size="small" danger onClick={() => setRejectPost(post)}>
              Từ chối
            </Button>
          </Space>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Group {groupId}</Typography.Title>
      {isError && (
        <Alert
          type="error"
          message="Không thể tải posts"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      <Card title="Bài viết chờ duyệt">
        <Table rowKey="id" columns={columns} dataSource={data?.items ?? []} loading={isLoading} pagination={false} />
      </Card>

      <Modal
        open={!!rejectPost}
        title="Từ chối bài viết"
        onCancel={() => { setRejectPost(null); setRejectReason(""); }}
        onOk={handleReject}
        confirmLoading={review.isPending}
        okText="Từ chối"
        cancelText="Huỷ"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
      >
        <Typography.Paragraph type="danger">
          Bài viết sẽ bị ẩn khỏi group {groupId} sau khi từ chối.
        </Typography.Paragraph>
        <Input.TextArea
          placeholder="Lý do từ chối (bắt buộc)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  );
}
