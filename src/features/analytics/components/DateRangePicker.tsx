import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DatePicker, Radio, Space } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { DateRange } from "../shared/types";

const { RangePicker } = DatePicker;

type Preset = "7" | "30" | "90" | "custom";

function formatDate(d: Dayjs): string {
  return d.format("YYYY-MM-DD");
}

function parseDate(value: string | null): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed : null;
}

function getPresetRange(preset: Preset): [Dayjs, Dayjs] {
  const end = dayjs().endOf("day");
  switch (preset) {
    case "7":
      return [end.clone().subtract(6, "day").startOf("day"), end];
    case "90":
      return [end.clone().subtract(89, "day").startOf("day"), end];
    case "30":
    default:
      return [end.clone().subtract(29, "day").startOf("day"), end];
  }
}

export function useAnalyticsDateRange(): {
  range: DateRange;
  preset: Preset;
  setPreset: (preset: Preset) => void;
  setCustomRange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const range = useMemo<DateRange>(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const fromDate = parseDate(fromParam);
    const toDate = parseDate(toParam);
    if (fromDate && toDate) {
      return { from: formatDate(fromDate), to: formatDate(toDate) };
    }
    const [defaultFrom, defaultTo] = getPresetRange("30");
    return { from: formatDate(defaultFrom), to: formatDate(defaultTo) };
  }, [searchParams]);

  const preset: Preset = useMemo(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    if (!fromParam || !toParam) return "30";
    const to = parseDate(toParam);
    if (!to || !to.isSame(dayjs().endOf("day"), "day")) return "custom";
    const days = to.diff(parseDate(fromParam), "day") + 1;
    if (days === 7) return "7";
    if (days === 30) return "30";
    if (days === 90) return "90";
    return "custom";
  }, [searchParams]);

  const updateSearchParams = useCallback(
    (next: { from: string; to: string }) => {
      setSearchParams(
        (prev) => {
          prev.set("from", next.from);
          prev.set("to", next.to);
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setPreset = useCallback(
    (value: Preset) => {
      if (value === "custom") return;
      const [from, to] = getPresetRange(value);
      updateSearchParams({ from: formatDate(from), to: formatDate(to) });
    },
    [updateSearchParams]
  );

  const setCustomRange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (!dates || !dates[0] || !dates[1]) return;
      updateSearchParams({ from: formatDate(dates[0]), to: formatDate(dates[1]) });
    },
    [updateSearchParams]
  );

  // Sync invalid or missing params to the default 30-day range without overwriting
  // valid values on every render.
  useEffect(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    if (!fromParam || !toParam || !parseDate(fromParam) || !parseDate(toParam)) {
      const [defaultFrom, defaultTo] = getPresetRange("30");
      setSearchParams(
        { from: formatDate(defaultFrom), to: formatDate(defaultTo) },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  return { range, preset, setPreset, setCustomRange };
}

interface DateRangePickerProps {
  className?: string;
}

export function DateRangePicker({ className }: DateRangePickerProps) {
  const { range, preset, setPreset, setCustomRange } = useAnalyticsDateRange();

  return (
    <Space className={className} wrap>
      <Radio.Group value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
        <Radio.Button value="7">7 ngày</Radio.Button>
        <Radio.Button value="30">30 ngày</Radio.Button>
        <Radio.Button value="90">90 ngày</Radio.Button>
        <Radio.Button value="custom">Tùy chỉnh</Radio.Button>
      </Radio.Group>
      <RangePicker
        value={[dayjs(range.from), dayjs(range.to)]}
        onChange={(dates) => setCustomRange(dates as [Dayjs | null, Dayjs | null] | null)}
        allowClear={false}
      />
    </Space>
  );
}
