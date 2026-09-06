import { useQuery } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import type { StudentEmailExport, StudentEmailQuery } from "../types";

/**
 * Xuất mail học viên có lọc — `GET /api/v1/courses/admin/reports/student-emails`.
 *
 * <p>Dùng `coreClient` (base `/api/v1`) chứ không `apiClient` (`/api/v1/admin`): endpoint nằm trong
 * module course chứ không phải cụm admin, giống `useCourseStudents` bên cạnh.
 */

export const studentEmailKeys = {
  all: ["admin", "student-emails"] as const,
  list: (q: StudentEmailQuery) => [...studentEmailKeys.all, q] as const,
};

/** `enabled=false` để trang chỉ gọi khi người dùng bấm Lọc — tránh kéo cả chục nghìn dòng lúc mở màn. */
export function useStudentEmails(query: StudentEmailQuery, enabled: boolean) {
  return useQuery<StudentEmailExport, Error>({
    queryKey: studentEmailKeys.list(query),
    enabled,
    retry: false,
    placeholderData: (previous) => previous,
    queryFn: () =>
      coreClient
        .get("/courses/admin/reports/student-emails", {
          params: {
            courseIds: query.courseIds?.length ? query.courseIds : undefined,
            packageIds: query.packageIds?.length ? query.packageIds : undefined,
            // "ALL" là mặc định của BE khi vắng mặt — đừng gửi, để URL sạch.
            status: query.status && query.status !== "ALL" ? query.status : undefined,
            from: query.from || undefined,
            to: query.to || undefined,
          },
          // BẮT BUỘC: axios mặc định serialize mảng thành `courseIds[]=a&courseIds[]=b`, mà Spring
          // `@RequestParam List<String>` chỉ nhận tham số tên ĐÚNG là `courseIds` — bộ lọc sẽ im
          // lặng không có tác dụng (không lỗi, chỉ trả sai kết quả). `indexes: null` cho ra
          // `courseIds=a&courseIds=b`, đúng thứ BE đọc.
          paramsSerializer: { indexes: null },
        })
        .then((r) => r.data as StudentEmailExport),
  });
}
