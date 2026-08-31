import { useMemo, useState } from "react";
import { Alert, Button, Card, Select, Space, Tag, Typography, message } from "antd";
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Can } from "../../../../shared/permissions";
import { useIsMobile } from "../../../../shared/hooks/useIsMobile";
import { MobileCard } from "../../../../shared/components/MobileCard";
import { ResponsiveTable } from "../../../../shared/components/ResponsiveTable";
import { DeleteConfirmModal } from "../../../../shared/components/DeleteConfirmModal";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { CourseSelect } from "../../../academic/components/CourseSelect";
import { useCourses } from "../../../academic/courses/api/courses.api";
import {
  useClip,
  useClips,
  useDeleteClip,
  usePublishClip,
  useUnpublishClip,
} from "../api/shortvideo.api";
import { ClipDetailDrawer } from "./ClipDetailDrawer";
import {
  CLIP_STATUS_LABEL,
  CLIP_STATUS_OPTIONS,
  clipStatusColor,
  formatDateTime,
  STORY_VISIBLE_HOURS,
  storyVisibility,
} from "../format";
import { formatDurationSeconds } from "../timecode";
import type { Clip, ClipStatus } from "../types";

const MANAGE = ["shortvideo.manage"];

/**
 * Phần "Studio": bảng clip đã cắt + Tải về / Publish / Gỡ / Xoá.
 *
 * <p>Xoá đi qua `DeleteConfirmModal` (ô lý do bắt buộc) chứ không phải `Modal.confirm` yes/no:
 * xoá clip cũng GỠ luôn tin đã đăng ở cộng đồng, tức là rút một thứ người khác đã nhìn thấy —
 * đúng loại thao tác mà repo này bắt ghi lý do vào audit.
 */
export function ClipStudioPanel() {
  const isMobile = useIsMobile();
  const [status, setStatus] = useState<ClipStatus | undefined>();
  const [courseId, setCourseId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Giữ ID chứ KHÔNG giữ nguyên đối tượng clip: đối tượng là ảnh chụp lúc bấm, còn Drawer thì mở
  // suốt trong lúc clip đổi trạng thái (cắt xong, publish, gỡ). Có ID thì đọc lại được bản mới.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Clip | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useClips({
    status,
    courseId,
    page,
    pageSize,
  });
  const deleteClip = useDeleteClip();
  const publishClip = usePublishClip();
  const unpublishClip = useUnpublishClip();

  // Tên khoá để bảng không hiện UUID trần. Dùng lại đúng nguồn của `CourseSelect` nên không
  // thêm request nào — react-query trả cache chung một queryKey.
  const courses = useCourses({ page: 1, pageSize: 1000 });
  const courseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses.data?.items ?? []) map.set(c.id, c.name);
    return map;
  }, [courses.data?.items]);
  const courseNameOf = (clip: Clip) =>
    clip.courseId ? (courseNameById.get(clip.courseId) ?? clip.courseId) : "—";

  const rows = data?.items ?? [];

  // Chi tiết = bản đọc riêng theo ID nếu đã về, còn không thì dòng trong bảng để Drawer mở ra là
  // thấy ngay chứ không trắng một nhịp. Bản mới về sẽ ĐÈ lên dòng cũ, không phải ngược lại.
  const detailQuery = useClip(detailId ?? undefined);
  const detail =
    (detailQuery.data?.id === detailId ? detailQuery.data : null) ??
    rows.find((clip) => clip.id === detailId) ??
    null;

  const togglePublish = (clip: Clip) => {
    if (clip.publishedStoryId) {
      unpublishClip.mutate(
        { id: clip.id },
        { onSuccess: () => message.success("Đã gỡ clip khỏi mục Tin") }
      );
    } else {
      publishClip.mutate(
        { id: clip.id },
        { onSuccess: () => message.success("Đã đăng clip lên mục Tin") }
      );
    }
  };

  /**
   * Nút tải về trỏ THẲNG `clipUrl` do dịch vụ video trả. `download` chỉ ép tải khi cùng origin;
   * clip nằm ở host khác nên trình duyệt có thể mở tab mới — vẫn tải được, nên không dựng thêm
   * đường proxy qua BE chỉ để đổi cái đó.
   */
  const downloadButton = (clip: Clip, block = false) => (
    <Button
      size={block ? "large" : "small"}
      block={block}
      icon={<DownloadOutlined />}
      disabled={!clip.clipUrl}
      href={clip.clipUrl ?? undefined}
      target="_blank"
      rel="noreferrer"
      download
    >
      Tải về
    </Button>
  );

  const publishButton = (clip: Clip, block = false) => (
    <Can permissions={MANAGE}>
      <Button
        size={block ? "large" : "small"}
        block={block}
        icon={clip.publishedStoryId ? <RollbackOutlined /> : <CloudUploadOutlined />}
        // Chỉ clip đã cắt xong mới đăng được: đăng một clip QUEUED/FAILED là đẩy link hỏng ra
        // trang cộng đồng cho người học bấm vào.
        disabled={clip.status !== "READY"}
        // Chỉ quay ở ĐÚNG dòng đang gửi đi: `isPending` trần làm cả bảng quay cùng lúc, nhìn như
        // vừa bấm publish cho mọi clip (khuôn `variables?.id` của XpMultiplierEventsPage).
        loading={
          (publishClip.isPending && publishClip.variables?.id === clip.id) ||
          (unpublishClip.isPending && unpublishClip.variables?.id === clip.id)
        }
        onClick={() => togglePublish(clip)}
      >
        {clip.publishedStoryId ? "Gỡ" : "Publish"}
      </Button>
    </Can>
  );

  /**
   * Mở Drawer chi tiết. Nút này phải có mặt ở CẢ HAI nhánh:
   *
   * <p>Điện thoại — nhánh mobile của `ResponsiveTable` chỉ vẽ `renderMobileCard`, KHÔNG chuyển tiếp
   * `onRow`, nên bấm vào thẻ không có tác dụng gì.
   *
   * <p>Laptop — click cả hàng thì có, nhưng nó vô hình: không ai đoán ra hàng bấm được, và <tr>
   * không focus được nên người dùng bàn phím KHÔNG có đường nào tới. Mà lý do cắt hỏng
   * (`clip.error`), mốc gốc, dung lượng, khung xem thử CHỈ nằm trong Drawer — một clip hiện Tag
   * "Hỏng" trong bảng mà không nói được vì sao là ngõ cụt. Nút tường minh, đúng khuôn `OrderListPage`.
   */
  const detailButton = (clip: Clip, block = false) => (
    <Button
      size={block ? "large" : "small"}
      block={block}
      icon={<InfoCircleOutlined />}
      onClick={() => setDetailId(clip.id)}
    >
      Xem chi tiết
    </Button>
  );

  const deleteButton = (clip: Clip, block = false) => (
    <Can permissions={MANAGE}>
      <Button
        size={block ? "large" : "small"}
        block={block}
        danger
        icon={<DeleteOutlined />}
        onClick={() => setDeleting(clip)}
      >
        Xoá
      </Button>
    </Can>
  );

  const columns: ColumnsType<Clip> = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      render: (title: string, clip) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{title || "(chưa đặt tên)"}</Typography.Text>
          {storyVisibility(clip) === "LIVE" && <Tag color="purple">Đang trên mục Tin</Tag>}
          {/* Hết 24h thì cộng đồng ngừng trả tin này, nhưng bản ghi vẫn còn (gỡ được, đăng lại được).
              Vẫn hiện "Đang trên mục Tin" ở đây là nói dối admin về thứ người học thực sự thấy. */}
          {storyVisibility(clip) === "EXPIRED" && (
            <Tag>{`Đã hết ${STORY_VISIBLE_HOURS}h hiển thị`}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Khoá / bài",
      key: "course",
      render: (_v, clip) => (
        <Space direction="vertical" size={0}>
          <span>{courseNameOf(clip)}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {clip.lessonId ?? "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Độ dài",
      key: "duration",
      align: "right",
      render: (_v, clip) => formatDurationSeconds(clip.durationSeconds),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (value: ClipStatus) => (
        <Tag color={clipStatusColor(value)}>{CLIP_STATUS_LABEL[value] ?? value}</Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 400,
      render: (_v, clip) => (
        <Space onClick={(e) => e.stopPropagation()}>
          {detailButton(clip)}
          {downloadButton(clip)}
          {publishButton(clip)}
          {deleteButton(clip)}
        </Space>
      ),
    },
  ];

  return (
    <Card size="small">
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
          <Space wrap>
            <CourseSelect
              value={courseId}
              onChange={(value) => {
                setCourseId(value);
                setPage(1);
              }}
              placeholder="Lọc theo khoá học"
              style={{ width: isMobile ? "100%" : 260 }}
            />
            <Select
              allowClear
              placeholder="Trạng thái"
              value={status}
              options={CLIP_STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              style={{ minWidth: 160, width: isMobile ? "100%" : undefined }}
            />
          </Space>
          <Button
            icon={<ReloadOutlined />}
            block={isMobile}
            // Vòng hỏi lại (poll 10s + bấm Làm mới) báo Ở ĐÂY, không đổ vào `loading` của bảng —
            // xem ghi chú tại `ResponsiveTable` bên dưới.
            loading={isFetching}
            onClick={() => refetch()}
          >
            Làm mới
          </Button>
        </Space>

        {isError && (
          <Alert
            type="error"
            showIcon
            message="Không tải được danh sách clip"
            description={adminErrorMessage(error)}
            action={
              <Button size="small" onClick={() => refetch()}>
                Thử lại
              </Button>
            }
          />
        )}

        <ResponsiveTable<Clip>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          // CHỈ lần tải đầu mới là "đang tải". Nhét `isFetching` vào đây thì mỗi vòng poll 10s
          // (bật khi còn clip QUEUED/RENDERING) sẽ THAY cả danh sách thẻ trên điện thoại bằng
          // khung xương — nhánh mobile của `ResponsiveTable` render Skeleton thay cho dữ liệu chứ
          // không phủ lên như `Table`. Việc đang chạy nền báo bằng spinner ở nút "Làm mới".
          loading={isLoading}
          size={isMobile ? "small" : "middle"}
          locale={{ emptyText: "Chưa có clip nào — sang tab “Tạo clip” để cắt clip đầu tiên." }}
          // Bảng nhiều cột: trên màn hẹp cho cuộn ngang trong khung thay vì ép chữ xuống dòng.
          scroll={{ x: "max-content" }}
          // Click cả hàng là lối TẮT, không phải lối duy nhất (nút "Xem chi tiết" ở cột Thao tác mới
          // là lối chính thức). `cursor:pointer` để hàng nói ra là nó bấm được — đúng khuôn
          // `AuditLogPage` / `SecurityLogPage`.
          onRow={(clip) => ({
            onClick: () => setDetailId(clip.id),
            style: { cursor: "pointer" },
          })}
          renderMobileCard={(clip) => (
            <MobileCard
              title={clip.title || "(chưa đặt tên)"}
              subtitle={
                <>
                  <Tag color={clipStatusColor(clip.status)} style={{ marginInlineEnd: 6 }}>
                    {CLIP_STATUS_LABEL[clip.status] ?? clip.status}
                  </Tag>
                  {formatDateTime(clip.createdAt)}
                </>
              }
              meta={[
                { label: "Khoá học", value: courseNameOf(clip) },
                { label: "Độ dài", value: formatDurationSeconds(clip.durationSeconds) },
              ]}
              extra={
                <Can permissions={MANAGE}>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="Xoá clip"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(clip);
                    }}
                  />
                </Can>
              }
              primaryAction={detailButton(clip, true)}
              actions={
                <>
                  {downloadButton(clip, true)}
                  {publishButton(clip, true)}
                </>
              }
            />
          )}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: !isMobile,
            simple: isMobile,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} clip`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? 10);
          }}
        />
      </Space>

      <ClipDetailDrawer
        open={detailId != null}
        clip={detail}
        courseName={detail ? courseNameOf(detail) : undefined}
        onClose={() => setDetailId(null)}
        actions={
          detail && (
            <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
              {downloadButton(detail)}
              {publishButton(detail)}
              {deleteButton(detail)}
            </Space>
          )
        }
      />

      {deleting && (
        <DeleteConfirmModal
          open={!!deleting}
          title="Xoá clip"
          description={
            <>
              Xoá HẲN clip <strong>{deleting.title || "(chưa đặt tên)"}</strong>, KHÔNG hoàn tác.
              {deleting.publishedStoryId
                ? " Clip đang nằm trên mục Tin của cộng đồng — xoá sẽ GỠ luôn tin đó."
                : ""}
            </>
          }
          loading={deleteClip.isPending}
          onConfirm={(reason) =>
            deleteClip.mutate(
              { id: deleting.id, reason },
              {
                onSuccess: () => {
                  message.success("Đã xoá clip");
                  if (detailId === deleting.id) setDetailId(null);
                  setDeleting(null);
                },
              }
            )
          }
          onCancel={() => setDeleting(null)}
        />
      )}
    </Card>
  );
}
