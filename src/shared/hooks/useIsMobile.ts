import { Grid } from "antd";

/**
 * Đang xem trên màn hẹp (điện thoại) hay không — mốc `md` của antd (<768px).
 *
 * <p>Dùng `Grid.useBreakpoint` chứ không tự nghe `matchMedia`: nó đã đồng bộ với đúng bộ breakpoint
 * mà `Row/Col` (`xs/sm/md`) dùng, nên layout và logic không lệch mốc nhau.
 *
 * <p>Lần render ĐẦU antd trả object rỗng (chưa đo xong) — khi đó `screens.md` là `undefined`, và
 * `!undefined === true` sẽ cho ra "mobile" trong một nhịp rồi nhảy về desktop. Vì vậy chỉ coi là
 * mobile khi ĐÃ đo được (`screens.xs != null`), tránh giao diện giật một nhịp trên máy bàn.
 */
export function useIsMobile(): boolean {
  const screens = Grid.useBreakpoint();
  const measured = Object.keys(screens).length > 0;
  return measured && !screens.md;
}
