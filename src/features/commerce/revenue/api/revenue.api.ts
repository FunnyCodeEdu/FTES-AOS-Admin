import { useQuery } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";

/** Một nhóm sản phẩm trong bảng doanh thu. */
export interface RevenueLine {
  category: string;
  orderCount: number;
  itemCount: number;
  gross: number;
  couponDiscount: number;
  coinDiscount: number;
  netCash: number;
}

/** Tổng toàn báo cáo kèm cờ kết toán. */
export interface RevenueTotals {
  orderCount: number;
  gross: number;
  couponDiscount: number;
  coinDiscount: number;
  netCash: number;
  orderTotalSum: number;
  variance: number;
  balanced: boolean;
}

/** Đối chiếu Xu: số Xu còn trong ví người dùng là NỢ phải trả của nền tảng. */
export interface CoinReconciliation {
  outstandingCoin: number;
  outstandingVnd: number;
  vndPerCoin: number;
}

export interface RevenueReport {
  from: string;
  to: string;
  lines: RevenueLine[];
  totals: RevenueTotals;
  coin: CoinReconciliation;
}

/** `GET /admin/revenue?from&to` — ngày theo ISO (yyyy-MM-dd), `to` tính TRỌN ngày. */
export function useRevenueReport(from: string, to: string) {
  return useQuery<RevenueReport>({
    queryKey: ["commerce", "revenue", from, to],
    queryFn: async () => {
      const res = await coreClient.get("/admin/revenue", { params: { from, to } });
      return (res.data?.data ?? res.data) as RevenueReport;
    },
  });
}
