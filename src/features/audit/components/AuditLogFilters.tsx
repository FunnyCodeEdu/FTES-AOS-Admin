import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, DatePicker, Input, Space } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { AuditLogParams } from "../shared/types";

const { RangePicker } = DatePicker;

export function useAuditFilters(): AuditLogParams & {
  setActorId: (value: string) => void;
  setAction: (value: string) => void;
  setDomain: (value: string) => void;
  setRange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  setPage: (page: number, pageSize: number) => void;
  reset: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const actorId = searchParams.get("actorId") ?? undefined;
  const action = searchParams.get("action") ?? undefined;
  const domain = searchParams.get("domain") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10);

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      setSearchParams(
        (prev) => {
          if (value) {
            prev.set(key, value);
          } else {
            prev.delete(key);
          }
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setRange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      setSearchParams(
        (prev) => {
          if (dates && dates[0] && dates[1]) {
            prev.set("from", dates[0].format("YYYY-MM-DD"));
            prev.set("to", dates[1].format("YYYY-MM-DD"));
          } else {
            prev.delete("from");
            prev.delete("to");
          }
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setPage = useCallback(
    (nextPage: number, nextPageSize: number) => {
      setSearchParams(
        (prev) => {
          prev.set("page", String(nextPage));
          prev.set("pageSize", String(nextPageSize));
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const reset = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const params = useMemo<AuditLogParams>(
    () => ({
      page,
      pageSize,
      actorId,
      action,
      domain,
      from,
      to,
    }),
    [page, pageSize, actorId, action, domain, from, to]
  );

  return {
    ...params,
    setActorId: (value) => setParam("actorId", value || undefined),
    setAction: (value) => setParam("action", value || undefined),
    setDomain: (value) => setParam("domain", value || undefined),
    setRange,
    setPage,
    reset,
  };
}

interface AuditLogFiltersProps {
  className?: string;
}

export function AuditLogFilters({ className }: AuditLogFiltersProps) {
  const filters = useAuditFilters();

  return (
    <Space className={className} wrap>
      <Input
        placeholder="Actor ID / tên"
        value={filters.actorId ?? ""}
        onChange={(e) => filters.setActorId(e.target.value)}
        onPressEnter={() => {}}
        style={{ width: 200 }}
      />
      <Input
        placeholder="Hành động"
        value={filters.action ?? ""}
        onChange={(e) => filters.setAction(e.target.value)}
        style={{ width: 160 }}
      />
      <Input
        placeholder="Domain"
        value={filters.domain ?? ""}
        onChange={(e) => filters.setDomain(e.target.value)}
        style={{ width: 160 }}
      />
      <RangePicker
        value={[
          filters.from ? dayjs(filters.from) : null,
          filters.to ? dayjs(filters.to) : null,
        ]}
        onChange={(dates) => filters.setRange(dates as [Dayjs | null, Dayjs | null] | null)}
      />
      <Button onClick={filters.reset}>Xoá bộ lọc</Button>
    </Space>
  );
}
