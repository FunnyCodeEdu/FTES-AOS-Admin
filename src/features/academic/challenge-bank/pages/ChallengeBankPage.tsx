import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Dropdown,
  Empty,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { MobileCard } from "../../../../shared/components/MobileCard";
import { ResponsiveTable } from "../../../../shared/components/ResponsiveTable";
import { EllipsisOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { ForbiddenError } from "../../../../shared/api/client";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { Can, hasAnyPermission } from "../../../../shared/permissions";
import { useMe } from "../../../auth/api";
import { useSubjects } from "../../subjects/api/subjects.api";
import { useChallengeBank } from "../api/challengeBankConsole.api";
import { hasActiveBankFilters } from "../api/bankQuery";
import { BankChallengeMetaModal } from "../components/BankChallengeMetaModal";
import { ChallengeBankFilters } from "../components/ChallengeBankFilters";
import { ChallengePaperModal } from "../components/ChallengePaperModal";
import { ChallengePlacementsModal } from "../components/ChallengePlacementsModal";
import { ChallengeTagsModal } from "../components/ChallengeTagsModal";
import { CreateBankChallengeModal } from "../components/CreateBankChallengeModal";
import {
  CHALLENGE_STATUS_COLOR,
  challengeDifficultyLabel,
  challengeStatusLabel,
  type BankChallengeRow,
  type BankSearchParams,
} from "../types";

const DEFAULT_PAGE_SIZE = 20;

/** Quyền GHI của console kho — mirror `access.require("admin.challenge.manage")` ở BE. */
const MANAGE_PERMISSIONS = ["admin.challenge.manage"];

/** Số bài đang dùng challenge: ưu tiên `placements`; response cũ chỉ có `lessonId` thì tính 1. */
export function placementCount(row: BankChallengeRow): number {
  if (Array.isArray(row.placements)) return row.placements.length;
  return row.lessonId ? 1 : 0;
}

/**
 * **Kho thử thách** — bề mặt admin cấp cao nhất cho kho theo MÔN.
 *
 * Đây là màn duy nhất trong Admin làm việc được với challenge **mà không phải bước vào một khoá học**:
 * `GET /admin/challenges/bank` nhận `courseId` và `subjectId` đều tuỳ chọn, nên nạp/duyệt đề PE của
 * một môn chưa có khoá nào là chuyện làm được. Mô hình: **kho thuộc về môn (workplace), khoá học chỉ
 * nhặt bài từ kho về gắn vào bài học** (xem mục "Chỗ dùng" của từng dòng).
 *
 * Phạm vi do BE quyết (`requireBankScope`): bỏ trống `courseId` cần quyền GLOBAL; người chỉ quản MỘT
 * khoá bắt buộc truyền `courseId`. FE KHÔNG đoán trước phạm vi — cứ gọi, và khi nhận 403 thì hướng
 * dẫn chọn khoá ở bộ lọc. Đoán ở client sẽ vừa sai (grant scoped không nằm trong danh sách leaf
 * global) vừa thừa (BE vẫn chặn).
 *
 * KHÔNG có bất kỳ UI chấm bài AI nào ở đây — tính năng đó đang khoá.
 */
export default function ChallengeBankPage() {
  const [params, setParams] = useState<BankSearchParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const [tagTarget, setTagTarget] = useState<BankChallengeRow | null>(null);
  const [paperTarget, setPaperTarget] = useState<BankChallengeRow | null>(null);
  const [placementTarget, setPlacementTarget] = useState<BankChallengeRow | null>(null);
  const [metaTarget, setMetaTarget] = useState<BankChallengeRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const bank = useChallengeBank(params);

  const { data: me } = useMe();
  const canManage =
    Boolean(me?.superAdmin) || hasAnyPermission(new Set(me?.permissions ?? []), MANAGE_PERMISSIONS);

  // Tên môn cho cột "Môn". Nuốt lỗi có chủ đích: query này đi GraphQL `adminSubjects` và cần quyền
  // đọc môn — người chỉ có quyền kho challenge có thể không có. Không tra được tên môn là bất tiện,
  // không phải lý do để chặn cả cái kho.
  const subjects = useSubjects({ page: 1, pageSize: 1000 });
  const subjectLabel = useCallback(
    (subjectId: string | null | undefined) => {
      if (!subjectId) return "—";
      const found = (subjects.data?.items ?? []).find((s) => s.id === subjectId);
      return found ? `${found.code}` : `${subjectId.slice(0, 8)}…`;
    },
    [subjects.data]
  );

  const patchFilters = (patch: Partial<BankSearchParams>) =>
    setParams((prev) => ({ ...prev, ...patch, page: 1 }));

  const resetFilters = () =>
    setParams({ page: 1, pageSize: params.pageSize });

  const isForbidden = bank.error instanceof ForbiddenError;
  const rows = bank.data?.items ?? [];
  const filtersActive = hasActiveBankFilters(params);

  const columns: TableProps<BankChallengeRow>["columns"] = useMemo(
    () => [
      {
        title: "Thử thách",
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{row.title}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.type}
              {row.free ? " · học thử" : ""}
              {row.slug ? ` · ${row.slug}` : ""}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Tag",
        width: 240,
        render: (_, row) =>
          (row.tags ?? []).length === 0 ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : (
            <Space size={[4, 4]} wrap>
              {(row.tags ?? []).map((tag) => (
                <Tag
                  key={tag.slug}
                  color="blue"
                  style={{ cursor: "pointer" }}
                  onClick={() => patchFilters({ tags: [tag.slug] })}
                >
                  {tag.label || tag.slug}
                </Tag>
              ))}
            </Space>
          ),
      },
      { title: "Môn", width: 110, render: (_, row) => subjectLabel(row.subjectId) },
      {
        title: "Độ khó",
        width: 110,
        render: (_, row) => challengeDifficultyLabel(row.difficulty),
      },
      {
        title: "Trạng thái",
        width: 130,
        render: (_, row) => (
          <Tag color={CHALLENGE_STATUS_COLOR[row.status] ?? "default"}>
            {challengeStatusLabel(row.status)}
          </Tag>
        ),
      },
      {
        title: "Đang dùng",
        width: 120,
        render: (_, row) => {
          const count = placementCount(row);
          return (
            <Button type="link" size="small" onClick={() => setPlacementTarget(row)}>
              {count > 0 ? `${count} bài` : "Chưa gắn"}
            </Button>
          );
        },
      },
      {
        title: "",
        width: 56,
        render: (_, row) => {
          const items = [
            { key: "tags", label: "Sửa tag", onClick: () => setTagTarget(row) },
            { key: "paper", label: "Đề thi (tệp)", onClick: () => setPaperTarget(row) },
            { key: "placements", label: "Chỗ dùng", onClick: () => setPlacementTarget(row) },
            canManage
              ? { key: "meta", label: "Sửa nhanh", onClick: () => setMetaTarget(row) }
              : null,
          ].filter(Boolean) as { key: string; label: string; onClick: () => void }[];
          return (
            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button size="small" type="text" icon={<EllipsisOutlined />} />
            </Dropdown>
          );
        },
      },
    ],
    // `patchFilters`/`setX` ổn định qua setState functional, chỉ nhãn môn & quyền là biến thiên.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subjectLabel, canManage]
  );

  return (
    <div>
      <Typography.Title level={3}>Kho thử thách</Typography.Title>
      <Typography.Paragraph type="secondary">
        Kho bài của <strong>môn</strong> (workplace) — nạp và phân loại đề ở đây, không cần bước vào
        khoá học nào. Khoá học nhặt bài từ kho về bằng mục <strong>Chỗ dùng</strong>. Đề PE quy ước
        gắn tag <code>PE</code> + <strong>mã môn</strong>.
      </Typography.Paragraph>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <ChallengeBankFilters
              value={params}
              onChange={patchFilters}
              onReset={resetFilters}
              hasFilters={filtersActive}
            />
            <Space>
              <Button
                icon={<ReloadOutlined />}
                loading={bank.isFetching}
                onClick={() => bank.refetch()}
              >
                Làm mới
              </Button>
              <Can permissions={MANAGE_PERMISSIONS}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                  Tạo đề vào kho
                </Button>
              </Can>
            </Space>
          </Space>

          {isForbidden && (
            <Alert
              type="warning"
              showIcon
              message="Tài khoản của bạn không xem được kho toàn cục"
              description={
                <>
                  Máy chủ chỉ cho xem kho <strong>của khoá bạn quản lý</strong>. Hãy chọn một khoá ở
                  bộ lọc <strong>Khoá học</strong> rồi thử lại. (Xem kho của mọi môn cần quyền
                  <code> admin.challenge.read</code> / <code>admin.challenge.manage</code> /
                  <code> admin.course.manage</code>.)
                </>
              }
            />
          )}

          {bank.isError && !isForbidden && (
            <Alert
              type="error"
              showIcon
              message="Không tải được kho thử thách"
              description={adminErrorMessage(bank.error)}
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={() => bank.refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {bank.isLoading && !bank.data ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <ResponsiveTable<BankChallengeRow>
              rowKey="id"
              size="small"
              dataSource={rows}
              columns={columns}
              loading={bank.isFetching && Boolean(bank.data)}
              pagination={{
                current: params.page,
                pageSize: params.pageSize,
                total: bank.data?.total ?? 0,
                showSizeChanger: true,
                showTotal: (total) => `${total} thử thách`,
                onChange: (page, pageSize) =>
                  setParams((prev) => ({ ...prev, page, pageSize })),
              }}
              locale={{
                emptyText: bank.isError ? (
                  "—"
                ) : (
                  <Empty
                    description={
                      filtersActive
                        ? "Không có thử thách nào khớp bộ lọc"
                        : "Kho chưa có thử thách nào"
                    }
                  >
                    {filtersActive && <Button onClick={resetFilters}>Xoá bộ lọc</Button>}
                  </Empty>
                ),
              }}
              renderMobileCard={(row) => (
                <MobileCard
                  title={row.title}
                  subtitle={
                    <>
                      <Tag color={CHALLENGE_STATUS_COLOR[row.status] ?? "default"} style={{ marginInlineEnd: 6 }}>
                        {challengeStatusLabel(row.status)}
                      </Tag>
                      {row.type}
                      {row.free ? " · học thử" : ""}
                    </>
                  }
                  meta={[
                    { label: "Môn", value: subjectLabel(row.subjectId) },
                    { label: "Độ khó", value: challengeDifficultyLabel(row.difficulty) },
                    {
                      label: "Tag",
                      value:
                        (row.tags ?? []).length === 0
                          ? "—"
                          : (row.tags ?? []).map((tag) => tag.label || tag.slug).join(", "),
                    },
                    {
                      label: "Đang dùng",
                      value: placementCount(row) > 0 ? `${placementCount(row)} bài` : "Chưa gắn",
                    },
                  ]}
                  primaryAction={
                    <Button block size="large" onClick={() => setPlacementTarget(row)}>
                      Gắn vào bài học
                    </Button>
                  }
                  actions={
                    <>
                      <Button block onClick={() => setTagTarget(row)}>
                        Sửa tag
                      </Button>
                      {canManage && (
                        <Button block onClick={() => setMetaTarget(row)}>
                          Sửa nhanh
                        </Button>
                      )}
                    </>
                  }
                />
              )}
              />
          )}

          <Tooltip title="Chấm bài bằng AI chưa mở trong bản này.">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Kho chỉ quản đề và phân loại — phần chấm bài không nằm ở đây.
            </Typography.Text>
          </Tooltip>
        </Space>
      </Card>

      <ChallengeTagsModal
        open={tagTarget !== null}
        challengeId={tagTarget?.id}
        challengeTitle={tagTarget?.title}
        disabled={!canManage}
        onClose={() => setTagTarget(null)}
        onSaved={() => bank.refetch()}
      />

      <ChallengePaperModal
        open={paperTarget !== null}
        challenge={paperTarget}
        disabled={!canManage}
        onClose={() => setPaperTarget(null)}
        onChanged={() => bank.refetch()}
      />

      <ChallengePlacementsModal
        open={placementTarget !== null}
        challenge={placementTarget}
        disabled={!canManage}
        onClose={() => setPlacementTarget(null)}
        onChanged={() => bank.refetch()}
      />

      <BankChallengeMetaModal
        open={metaTarget !== null}
        challenge={metaTarget}
        disabled={!canManage}
        onClose={() => setMetaTarget(null)}
        onSaved={() => bank.refetch()}
      />

      <CreateBankChallengeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          bank.refetch();
          // Bước 2 của luồng "tạo đề": mở ngay chỗ tải tệp đề cho thử thách vừa tạo.
          setPaperTarget(row);
        }}
      />
    </div>
  );
}
