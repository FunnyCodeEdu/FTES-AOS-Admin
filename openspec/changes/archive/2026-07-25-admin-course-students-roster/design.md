# Design — admin-course-students-roster

## 1. API

- Hook `useCourseStudents(courseId: string | undefined)` trong
  `features/academic/courses/api/courses.api.ts`:
  - `coreClient.get(`/courses/admin/reports/courses/${courseId}/students`)` — path đã xác
    minh trên `CourseReportController` (`@RequestMapping("/api/v1/courses/admin/reports")` +
    `@GetMapping("/courses/{courseId}/students")`).
  - Type:
    ```ts
    interface StudentEmailView { userId: string; username: string; email: string }
    interface CourseStudentsView {
      courseId: string; courseTitle: string; slugName: string;
      totalStudents: number; students: StudentEmailView[];
    }
    ```
  - Query key `coursesKeys.students(courseId)` (thêm vào `courses.keys.ts`), `enabled: !!courseId`.

## 2. UI — `CourseStudentsTab.tsx`

- Thêm vào `CourseDetailPage.items` (sau tab "Học thử"), CHỈ khi permission set chứa
  `admin.course.manage` (đọc từ permission store/hook sẵn có của routeRegistry):
  `{key: "students", label: "Học viên", children: <CourseStudentsTab courseId={course.id} />}`.
- Nội dung: `Statistic` tổng học viên + antd `Table` (username / email / userId rút gọn),
  `Input.Search` filter client-side theo username hoặc email (roster 1 course không phân
  trang BE — chấp nhận, ghi chú nâng cấp nếu > 1000 rows), nút "Copy emails"
  (`navigator.clipboard.writeText(emails.join(", "))` + message thành công).
- Loading/skeleton + error `Alert` theo pattern các tab sẵn có; 403 từ BE → Alert "Bạn không
  có quyền xem học viên".
- PII: không log; không đưa email vào URL.

## 3. Dependency

- BE endpoint LIVE (change `course-admin-reports` đã merge). Data test: seed
  `course-demo-seed-dev` tạo enrollment demo → roster course free có ≥1 học viên khi
  account test tồn tại.
