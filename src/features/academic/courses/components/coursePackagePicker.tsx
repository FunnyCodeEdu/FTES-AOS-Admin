import { useEffect, useMemo, useState } from "react";
import { Alert, Select, Typography } from "antd";
import type { CoursePackage, CourseType } from "../../types";
import { useCoursePackages } from "../api/courses.api";

/** Gói còn bán được (gói "Ngừng bán" = ARCHIVED vẫn cấp quyền cho purchase cũ, nhưng không cấp MỚI). */
export function activePackages(packages: CoursePackage[] | undefined): CoursePackage[] {
  return (packages ?? []).filter((p) => (p.status ?? "").toUpperCase() === "ACTIVE");
}

/**
 * Gói chọn sẵn khi mở modal — CÙNG thứ tự với `EnrollmentService.resolveGrantPackage` ở BE:
 * gói mặc định đang bán → gói đang bán DUY NHẤT → không chọn gì (bắt admin tự chọn).
 *
 * Khoá nhiều gói mà không gói nào mặc định thì CỐ Ý trả `undefined`: các gói của một khoá khác nhau
 * đúng ở phần đắt tiền (Gói Zoom có buổi live, Gói Record chỉ có video), nên chọn hộ một cái là cấp
 * nhầm nội dung mà không ai biết — đây chính là chỗ admin đang mù.
 */
export function pickDefaultPackageId(packages: CoursePackage[] | undefined): string | undefined {
  const active = activePackages(packages);
  const preferred = active.find((p) => p.defaultPackage);
  if (preferred) return preferred.id;
  if (active.length === 1) return active[0].id;
  return undefined;
}

/** Nhãn gói trong Select: tên + giá bán (gói ngừng bán ghi rõ để admin hiểu vì sao không chọn được). */
export function packageLabel(pkg: CoursePackage): string {
  const price =
    typeof pkg.salePrice === "number" ? `${pkg.salePrice.toLocaleString("vi-VN")}đ` : "chưa đặt giá";
  const archived = (pkg.status ?? "").toUpperCase() === "ARCHIVED" ? " · đã ngừng bán" : "";
  const isDefault = pkg.defaultPackage ? " · mặc định" : "";
  return `${pkg.name} — ${price}${isDefault}${archived}`;
}

export interface CoursePackagePicker {
  /** Ô chọn gói (null khi khoá không bán theo gói → không chiếm chỗ trong modal). */
  node: React.ReactNode;
  /** Gói đang chọn — gửi kèm khi cấp học viên. */
  packageId: string | undefined;
  /** Khoá bán theo gói nhưng CHƯA chọn được gói → chặn nút cấp (BE cũng chặn, đây chỉ là chốt trên). */
  blocked: boolean;
  reset: () => void;
}

interface Options {
  /**
   * `saleMode` của khoá khi biết. Không truyền (vd modal cấp lại theo kỳ chỉ có courseId) → suy ra
   * từ chính danh sách gói: khoá LEGACY không có gói nào nên ô chọn không hiện ra.
   */
  saleMode?: CourseType;
}

/**
 * Cụm "chọn gói khi cấp học viên" dùng chung cho mọi chỗ cấp học viên trong Admin.
 *
 * Vì sao phải có: trên khoá `saleMode = PACKAGE`, quyền học nằm ở `package_purchases`, còn dòng
 * enrollment chỉ là danh bạ. Admin cấp mà không kèm gói thì học viên vào khoá vẫn chỉ xem được bài
 * học thử — không lỗi, không cảnh báo, chỉ có học viên nhắn tin hỏi.
 */
export function useCoursePackagePicker(
  courseId: string | undefined,
  { saleMode }: Options = {}
): CoursePackagePicker {
  const { data: packages, isFetching } = useCoursePackages(courseId);
  const [picked, setPicked] = useState<string | undefined>(undefined);
  // Admin đã tự chọn thì KHÔNG cho default ghi đè lại (mỗi lần refetch danh sách gói sẽ nhảy về mặc
  // định giữa chừng, và cái nhảy đó im lặng — admin bấm cấp mà không biết gói vừa chọn đã bị đổi).
  const [touched, setTouched] = useState(false);

  const applicable = saleMode ? saleMode === "PACKAGE" : (packages?.length ?? 0) > 0;
  const fallback = useMemo(() => pickDefaultPackageId(packages), [packages]);

  useEffect(() => {
    if (!touched) setPicked(fallback);
  }, [fallback, touched]);

  const reset = () => {
    setTouched(false);
    setPicked(fallback);
  };

  if (!applicable) {
    return { node: null, packageId: undefined, blocked: false, reset };
  }

  const options = (packages ?? []).map((p) => ({
    label: packageLabel(p),
    value: p.id,
    disabled: (p.status ?? "").toUpperCase() !== "ACTIVE",
  }));

  const node = (
    <div style={{ marginBottom: 16 }}>
      <Typography.Text strong>Gói cấp cho học viên</Typography.Text>
      <Select
        style={{ width: "100%", marginTop: 4 }}
        placeholder={isFetching ? "Đang tải gói..." : "Chọn gói"}
        loading={isFetching}
        value={picked}
        options={options}
        onChange={(value) => {
          setTouched(true);
          setPicked(value);
        }}
        notFoundContent={isFetching ? "Đang tải..." : "Khoá chưa có gói nào"}
      />
      {!isFetching && options.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 8 }}
          message="Khoá bán theo gói nhưng chưa có gói nào"
          description="Tạo gói ở tab 'Giá & gói' trước, nếu không học viên được thêm vào sẽ chỉ xem được bài học thử."
        />
      ) : null}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Khoá này bán theo gói — quyền học viên nhận được là quyền của ĐÚNG gói bạn chọn ở đây.
      </Typography.Text>
    </div>
  );

  return { node, packageId: picked, blocked: !picked, reset };
}
