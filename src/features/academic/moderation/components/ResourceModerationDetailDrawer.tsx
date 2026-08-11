import { useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  List,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { CheckOutlined, CloseOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { downloadResourceFile } from "../../resources/api/resources.api";
import { RESOURCE_VISIBILITY_LABELS } from "../../resources/constants";
import type { PendingResourceSummary, ResourceVisibility } from "../../types";
import { useModerationResourceDetail, useModerationResourceVersions } from "../api/moderation.api";
import { FeAlbumPreview } from "./FeAlbumPreview";
import { ResourceTypeChip } from "./ResourceTypeChip";

interface ResourceModerationDetailDrawerProps {
  item: PendingResourceSummary | null;
  subjectLabel: string;
  approving: boolean;
  rejecting: boolean;
  onClose: () => void;
  onApprove: (item: PendingResourceSummary) => void;
  onReject: (item: PendingResourceSummary) => void;
}

/**
 * Visibility hiển thị được từ HAI nguồn khác vocab nhau:
 *  - hàng đợi (`ResourceSummary`) trả enum THÔ của BE: PUBLIC / ENROLLED_ONLY / MEMBERS / PRIVATE;
 *  - admin detail (`ResourceDetailResponse`) đã map sang vocab FE: public / enrolled / package_only.
 * Chuẩn hoá về vocab FE rồi tra `RESOURCE_VISIBILITY_LABELS` để nhãn khớp mọi nơi khác trong admin.
 */
function visibilityLabel(raw: string | null | undefined): string {
  if (!raw) return "—";
  const v = raw.toUpperCase();
  let key: ResourceVisibility;
  if (v === "PUBLIC" || raw === "public") key = "public";
  else if (v === "PRIVATE" || v === "PACKAGE_ONLY" || raw === "package_only") key = "package_only";
  else key = "enrolled"; // ENROLLED_ONLY, MEMBERS, "enrolled"
  return RESOURCE_VISIBILITY_LABELS[key];
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}

/**
 * Drawer xem chi tiết + quyết định cho một mục trong hàng đợi.
 *
 * Nguyên tắc dựng màn này: **không có đường nào làm hỏng việc duyệt**. Mọi dữ liệu bổ sung
 * (metadata admin, danh sách phiên bản, album FE) đều nằm trong khối RIÊNG với trạng thái lỗi
 * riêng; cặp nút Duyệt/Từ chối ở footer luôn render vì mọi thứ chúng cần (`id`, `title`) đã có sẵn
 * trong dòng bảng truyền vào. Kể cả khi caller không có `admin.resource.read` (detail 403) thì
 * người chỉ có `resource.approve` vẫn duyệt được — đúng ý đồ OR của route guard.
 *
 * CỐ Ý KHÔNG có nút xoá: `DELETE /admin/resources/{id}` là HARD delete, đặt cạnh nút Duyệt là tai
 * nạn chờ xảy ra. Xoá học liệu sống ở trang Học liệu, nơi có `DeleteConfirmModal` + lý do.
 */
export function ResourceModerationDetailDrawer({
  item,
  subjectLabel,
  approving,
  rejecting,
  onClose,
  onApprove,
  onReject,
}: ResourceModerationDetailDrawerProps) {
  const id = item?.id;
  const isFeAlbum = item?.type === "FE";
  const detail = useModerationResourceDetail(id);
  const versions = useModerationResourceVersions(id, !!item && !isFeAlbum);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    if (!id) return;
    setDownloading(true);
    downloadResourceFile(id)
      .catch((err) => message.error(adminErrorMessage(err)))
      .finally(() => setDownloading(false));
  };

  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      width={720}
      destroyOnClose
      title={
        <Space wrap>
          <span>{item?.title}</span>
          {item && <ResourceTypeChip type={item.type} />}
          <Tag color="orange">Chờ duyệt</Tag>
        </Space>
      }
      footer={
        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
          <Button onClick={onClose}>Đóng</Button>
          <Can permissions={["resource.approve"]}>
            <Button
              danger
              icon={<CloseOutlined />}
              loading={rejecting}
              disabled={approving}
              onClick={() => item && onReject(item)}
            >
              Từ chối
            </Button>
          </Can>
          <Can permissions={["resource.approve"]}>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={approving}
              disabled={rejecting}
              onClick={() => item && onApprove(item)}
            >
              Duyệt
            </Button>
          </Can>
        </Space>
      }
    >
      {!item ? null : (
        <>
          {/* Khối metadata — hỏng thì rơi về dữ liệu của dòng bảng, KHÔNG chặn drawer. */}
          {detail.isError && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Không tải được thông tin chi tiết"
              description={`${detail.error?.message ?? ""} Đang hiển thị dữ liệu rút gọn từ hàng đợi; bạn vẫn duyệt/từ chối được.`}
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={() => detail.refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {detail.isLoading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : (
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Môn học">
                {detail.data?.subjectName || subjectLabel}
              </Descriptions.Item>
              <Descriptions.Item label="Người gửi">
                {detail.data?.createdBy || (
                  <Typography.Text type="secondary">
                    Không có trong dữ liệu hàng đợi
                  </Typography.Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Phạm vi hiển thị">
                {visibilityLabel(detail.data?.visibility ?? item.visibility)}
              </Descriptions.Item>
              <Descriptions.Item label="Giấy phép">
                {detail.data?.license || item.license || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Phiên bản hiện tại">
                {detail.data?.currentVersion ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Tạo lúc">
                {formatDateTime(detail.data?.createdAt ?? item.createdAt)}
              </Descriptions.Item>
              {detail.data?.rejectReason && (
                <Descriptions.Item label="Lý do từ chối trước đó">
                  <Typography.Text type="danger">{detail.data.rejectReason}</Typography.Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          )}

          <Divider orientation="left" plain>
            {isFeAlbum ? "Album ảnh đề FE" : "Tệp & phiên bản"}
          </Divider>

          {isFeAlbum ? (
            <FeAlbumPreview resourceId={item.id} />
          ) : (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Button
                icon={<DownloadOutlined />}
                loading={downloading}
                onClick={handleDownload}
                disabled={!detail.data?.currentVersion && versions.data?.items.length === 0}
              >
                Tải tệp để kiểm tra
              </Button>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Tệp tải về đã được backend đóng watermark FTES — đó là hành vi bình thường, không
                phải lỗi của bản gửi lên.
              </Typography.Text>

              {versions.isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : versions.isError ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Không tải được lịch sử phiên bản"
                  description={versions.error?.message}
                  action={
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => versions.refetch()}>
                      Thử lại
                    </Button>
                  }
                />
              ) : (versions.data?.items.length ?? 0) === 0 ? (
                <Empty description="Chưa có phiên bản tệp nào được tải lên." />
              ) : (
                <List
                  size="small"
                  bordered
                  dataSource={versions.data?.items ?? []}
                  renderItem={(version) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`Phiên bản ${version.version}`}
                        description={
                          <Space size="small" wrap>
                            <Tag
                              color={
                                version.status === "approved"
                                  ? "green"
                                  : version.status === "rejected"
                                    ? "red"
                                    : "orange"
                              }
                            >
                              {version.status === "approved"
                                ? "Đã tải lên"
                                : version.status === "rejected"
                                  ? "Tải lên lỗi"
                                  : "Đang tải lên"}
                            </Tag>
                            <span>{version.createdBy || "—"}</span>
                            <span>{formatDateTime(version.createdAt)}</span>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Space>
          )}
        </>
      )}
    </Drawer>
  );
}
