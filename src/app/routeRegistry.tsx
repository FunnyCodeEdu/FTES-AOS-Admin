import {
  AuditOutlined,
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  CommentOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HomeOutlined,
  NotificationOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import DashboardPage from "../features/analytics/pages/DashboardPage";
import DomainDashboardPage from "../features/analytics/pages/DomainDashboardPage";
import AiModelConfigPage from "../features/ai/pages/AiModelConfigPage";
import AiInsightsPage from "../features/ai/pages/AiInsightsPage";
import AuditLogPage from "../features/audit/pages/AuditLogPage";
import SecurityLogPage from "../features/audit/pages/SecurityLogPage";
import AccessMatrixPage from "../features/rbac/pages/AccessMatrixPage";
import PermissionCatalogPage from "../features/rbac/pages/PermissionCatalogPage";
import RoleEditorPage from "../features/rbac/pages/RoleEditorPage";
import RoleListPage from "../features/rbac/pages/RoleListPage";
import UserAccessDetailPage from "../features/rbac/pages/UserAccessDetailPage";
import UserAccessSearchPage from "../features/rbac/pages/UserAccessSearchPage";
import { ForbiddenPage, NotFoundPage } from "../shared/permissions";
import UserListPage from "../features/users/pages/UserListPage";
import UserDetailPage from "../features/users/pages/UserDetailPage";
import ImpersonateViewerPage from "../features/users/pages/ImpersonateViewerPage";
import DeviceOversightPage from "../features/users/pages/DeviceOversightPage";
import UnlockAppealsPage from "../features/users/pages/UnlockAppealsPage";
import SubjectListPage from "../features/academic/subjects/pages/SubjectListPage";
import SubjectDetailPage from "../features/academic/subjects/pages/SubjectDetailPage";
import TermListPage from "../features/academic/terms/pages/TermListPage";
import TermDetailPage from "../features/academic/terms/pages/TermDetailPage";
import GoldenBoardListPage from "../features/academic/golden-board/pages/GoldenBoardListPage";
import CategoryListPage from "../features/academic/categories/pages/CategoryListPage";
import CourseListPage from "../features/academic/courses/pages/CourseListPage";
import CourseDetailPage from "../features/academic/courses/pages/CourseDetailPage";
import ResourceListPage from "../features/academic/resources/pages/ResourceListPage";
import ResourceDetailPage from "../features/academic/resources/pages/ResourceDetailPage";
import ResourceModerationQueuePage from "../features/academic/moderation/pages/ResourceModerationQueuePage";
import PackListPage from "../features/academic/packs/pages/PackListPage";
import PackDetailPage from "../features/academic/packs/pages/PackDetailPage";
import QuizBankPage from "../features/academic/quiz/pages/QuizBankPage";
import ChallengeBankPage from "../features/academic/challenge-bank/pages/ChallengeBankPage";
import ChallengeReviewQueuePage from "../features/academic/challenge-bank/pages/ChallengeReviewQueuePage";
import LessonEditPage from "../features/academic/lessons/pages/LessonEditPage";
import MentorConsolePage from "../features/academic/ai-assist/pages/MentorConsolePage";
import CommerceLandingPage from "../features/commerce/dashboard/pages/CommerceLandingPage";
import OrderListPage from "../features/commerce/orders/pages/OrderListPage";
import OrderDetailPage from "../features/commerce/orders/pages/OrderDetailPage";
import PaymentListPage from "../features/commerce/payments/pages/PaymentListPage";
import ReconciliationPage from "../features/commerce/payments/pages/ReconciliationPage";
import RefundListPage from "../features/commerce/refunds/pages/RefundListPage";
import RefundDetailPage from "../features/commerce/refunds/pages/RefundDetailPage";
import WalletLookupPage from "../features/commerce/wallets/pages/WalletLookupPage";
import WalletDetailPage from "../features/commerce/wallets/pages/WalletDetailPage";
import CouponListPage from "../features/commerce/catalog/pages/CouponListPage";
import ProductListPage from "../features/commerce/catalog/pages/ProductListPage";
import ModerationQueuePage from "../features/moderation/pages/ModerationQueuePage";
import WorkflowBoardPage from "../features/moderation/pages/WorkflowBoardPage";
import ModerationLogPage from "../features/moderation/pages/ModerationLogPage";
import PostsPage from "../features/community/pages/PostsPage";
import GroupsPage from "../features/community/pages/GroupsPage";
import GroupDetailPage from "../features/community/pages/GroupDetailPage";
import CampusListPage from "../features/community/campuses/pages/CampusListPage";
import NotificationsPage from "../features/operations/pages/NotificationsPage";
import BannersPage from "../features/operations/pages/BannersPage";
import AnnouncementsPage from "../features/operations/pages/AnnouncementsPage";
import EventsPage from "../features/operations/pages/EventsPage";
import EventDetailPage from "../features/operations/pages/EventDetailPage";
import FlagsPage from "../features/operations/pages/FlagsPage";
import ConfigPage from "../features/operations/pages/ConfigPage";
import InviteListPage from "../features/ctv-program/pages/InviteListPage";
import InviteDetailPage from "../features/ctv-program/pages/InviteDetailPage";
import MemberListPage from "../features/ctv-program/pages/MemberListPage";
import MemberDetailPage from "../features/ctv-program/pages/MemberDetailPage";
import TeamPerformancePage from "../features/ctv-program/pages/TeamPerformancePage";
import OnboardingPage from "../features/ctv-workspace/pages/OnboardingPage";
import WorkspaceHomePage from "../features/ctv-workspace/pages/WorkspaceHomePage";
import CtvGroupPage from "../features/ctv-workspace/pages/CtvGroupPage";
import CtvResourcePage from "../features/ctv-workspace/pages/CtvResourcePage";
import CtvKpiPage from "../features/ctv-workspace/pages/CtvKpiPage";
import BlogListPage from "../features/content/blog/pages/BlogListPage";
import BlogEditorPage from "../features/content/blog/pages/BlogEditorPage";
import BlogCommentsPage from "../features/content/blog/pages/BlogCommentsPage";
import InstructorHomePage from "../features/instructor-workspace/pages/InstructorHomePage";
import MyCoursesPage from "../features/instructor-workspace/pages/MyCoursesPage";
import MyCourseDetailPage from "../features/instructor-workspace/pages/MyCourseDetailPage";
import MyEarningsPage from "../features/instructor-workspace/pages/MyEarningsPage";
import PayrollListPage from "../features/payroll/pages/PayrollListPage";
import QuestionBankListPage from "../features/question-bank/pages/QuestionBankListPage";
import QuestionBankDetailPage from "../features/question-bank/pages/QuestionBankDetailPage";
import QuestsPage from "../features/gamification/pages/QuestsPage";
import XpRulesPage from "../features/gamification/pages/XpRulesPage";
import RewardPoolsPage from "../features/gamification/pages/RewardPoolsPage";
import SeasonsPage from "../features/gamification/pages/SeasonsPage";
import XpMultiplierEventsPage from "../features/gamification/pages/XpMultiplierEventsPage";

export interface NavEntry {
  label: string;
  icon?: ReactNode;
  group?: string;
}

export interface RouteDefinition {
  path: string;
  element: ReactNode;
  layout: "auth" | "admin" | "none";
  requiredPermissions?: string[];
  requiredScope?: boolean;
  /**
   * Khi đặt cùng `requiredScope`, chỉ cho qua nếu grant còn hiệu lực đúng loại scope này
   * (vd "COURSE" cho console giảng viên) — chặn user chỉ có scope loại khác (GROUP/SUBJECT).
   */
  requiredScopeType?: string;
  /** Thông điệp 403 khi thiếu scope (mặc định trung tính; route có thể tuỳ biến theo ngữ cảnh). */
  scopeMessage?: string;
  nav?: NavEntry;
}

export const routeRegistry: RouteDefinition[] = [
  {
    path: "/",
    element: <DashboardPage />,
    layout: "admin",
    nav: { label: "Trang chủ", icon: <HomeOutlined /> },
  },
  {
    path: "/system/rbac/roles",
    element: <RoleListPage />,
    layout: "admin",
    requiredPermissions: ["admin.rbac.read"],
    nav: { label: "Vai trò & quyền", icon: <SafetyOutlined />, group: "Hệ thống" },
  },
  {
    path: "/system/rbac/roles/new",
    element: <RoleEditorPage />,
    layout: "admin",
    requiredPermissions: ["admin.rbac.read"],
  },
  {
    path: "/system/rbac/roles/:roleId",
    element: <RoleEditorPage />,
    layout: "admin",
    requiredPermissions: ["admin.rbac.read"],
  },
  {
    path: "/system/rbac/permissions",
    element: <PermissionCatalogPage />,
    layout: "admin",
    requiredPermissions: ["admin.rbac.read"],
    nav: { label: "Catalog quyền", icon: <SafetyOutlined />, group: "Hệ thống" },
  },
  {
    path: "/system/rbac/users",
    element: <UserAccessSearchPage />,
    layout: "admin",
    requiredPermissions: ["admin.rbac.read"],
    nav: { label: "Phân quyền user", icon: <SafetyOutlined />, group: "Hệ thống" },
  },
  {
    path: "/system/rbac/users/:userId",
    element: <UserAccessDetailPage />,
    layout: "admin",
    requiredPermissions: ["admin.rbac.read"],
  },
  {
    path: "/system/rbac/matrix",
    element: <AccessMatrixPage />,
    layout: "admin",
    requiredPermissions: ["admin.rbac.read"],
    nav: { label: "Ma trận quyền", icon: <SafetyOutlined />, group: "Hệ thống" },
  },
  {
    path: "/users",
    element: <UserListPage />,
    layout: "admin",
    requiredPermissions: ["user.view", "admin.user.read"],
    nav: { label: "Người dùng", icon: <UserOutlined />, group: "Hệ thống" },
  },
  {
    path: "/users/devices",
    element: <DeviceOversightPage />,
    layout: "admin",
    // Trang CHỈ ĐỌC (nút Khoá bên trong tự gác thêm bằng `user.lock`), nên vào được bằng quyền
    // xem phiên — người trực hỗ trợ cần nhìn thấy bằng chứng kể cả khi không được khoá.
    requiredPermissions: ["user.session.view"],
    nav: { label: "Tài khoản dùng chung", icon: <UserOutlined />, group: "Hệ thống" },
  },
  {
    path: "/users/appeals",
    element: <UnlockAppealsPage />,
    layout: "admin",
    requiredPermissions: ["user.lock"],
    nav: { label: "Đơn xin mở khoá", icon: <UserOutlined />, group: "Hệ thống" },
  },
  {
    // ĐẶT SAU hai route tĩnh ở trên: react-router v6 chấm điểm theo độ cụ thể chứ không theo thứ
    // tự, nên thực ra không đua — nhưng giữ thứ tự này để người đọc thấy ngay `/users/devices`
    // không phải là một `:id`.
    path: "/users/:id",
    element: <UserDetailPage />,
    layout: "admin",
    requiredPermissions: ["user.view", "admin.user.read"],
  },
  {
    path: "/users/:id/impersonate",
    element: <ImpersonateViewerPage />,
    layout: "admin",
    requiredPermissions: ["user.view", "admin.user.read"],
  },
  {
    path: "/system/audit",
    element: <AuditLogPage />,
    layout: "admin",
    requiredPermissions: ["admin.audit.read"],
    nav: { label: "Audit log", icon: <AuditOutlined />, group: "Hệ thống" },
  },
  {
    path: "/system/security-log",
    element: <SecurityLogPage />,
    layout: "admin",
    requiredPermissions: ["security.log.view"],
    nav: { label: "Security log", icon: <SafetyOutlined />, group: "Hệ thống" },
  },
  {
    path: "/ai/models",
    element: <AiModelConfigPage />,
    layout: "admin",
    requiredPermissions: ["ai.admin.manage"],
    nav: { label: "Cấu hình AI", icon: <RobotOutlined />, group: "Hệ thống" },
  },
  {
    path: "/ai/insights",
    element: <AiInsightsPage />,
    layout: "admin",
    requiredPermissions: ["ai.admin.manage"],
    nav: { label: "AI Insights", icon: <RobotOutlined />, group: "Hệ thống" },
  },
  {
    path: "/academic/subjects",
    element: <SubjectListPage />,
    layout: "admin",
    requiredPermissions: ["subject.view", "admin.subject.read"],
    nav: { label: "Môn học", icon: <BookOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/subjects/:id",
    element: <SubjectDetailPage />,
    layout: "admin",
    requiredPermissions: ["subject.view", "admin.subject.read"],
  },
  {
    path: "/academic/terms",
    element: <TermListPage />,
    layout: "admin",
    requiredPermissions: ["term.view"],
    nav: { label: "Kỳ học", icon: <CalendarOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/terms/:id",
    element: <TermDetailPage />,
    layout: "admin",
    requiredPermissions: ["term.view"],
  },
  {
    // Bảng vàng neo theo KỲ nên nằm ngay cạnh màn Kỳ học. Gate MỘT leaf `goldenboard.manage`
    // (V322 grant ADMIN/SUPER_ADMIN/ADMIN_ACADEMIC) — đúng leaf mà BE chốt cho cả đọc lẫn ghi.
    path: "/academic/golden-board",
    element: <GoldenBoardListPage />,
    layout: "admin",
    requiredPermissions: ["goldenboard.manage"],
    nav: { label: "Bảng vàng", icon: <TrophyOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/categories",
    element: <CategoryListPage />,
    layout: "admin",
    requiredPermissions: ["course.category.manage"],
    nav: { label: "Danh mục khoá học", icon: <FolderOpenOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/courses",
    element: <CourseListPage />,
    layout: "admin",
    requiredPermissions: ["admin.course.read"],
    nav: { label: "Khoá học", icon: <ReadOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/courses/:id",
    element: <CourseDetailPage />,
    layout: "admin",
    requiredPermissions: ["admin.course.read"],
  },
  {
    path: "/academic/resources",
    element: <ResourceListPage />,
    layout: "admin",
    requiredPermissions: ["resource.view", "admin.resource.read"],
    nav: { label: "Học liệu", icon: <FileTextOutlined />, group: "Học thuật" },
  },
  {
    // Hàng đợi duyệt TẬP TRUNG: đọc `GET /api/v1/resources/moderation/pending` — nguồn duy nhất đã
    // scope sẵn phía BE theo `approvableSubjectIds()` (approver toàn cục thấy tất, CTV theo môn chỉ
    // thấy môn mình, không có phạm vi → rỗng chứ không 403).
    // Guard OR: `resource.approve` để duyệt, `admin.resource.read` cho admin học thuật vào xem tồn
    // đọng (vào được nhưng `<Can>` ẩn hết nút quyết định).
    path: "/academic/moderation",
    element: <ResourceModerationQueuePage />,
    layout: "admin",
    requiredPermissions: ["resource.approve", "admin.resource.read"],
    // Nhãn phải PHÂN BIỆT được với "Duyệt học liệu" (màn GraphQL admin-global có sẵn bên dưới):
    // màn này mới là chỗ duyệt đề thi PE/FE (xem trước album) và chạy đúng theo phạm vi duyệt.
    nav: {
      label: "Duyệt đề thi & học liệu",
      icon: <SafetyCertificateOutlined />,
      group: "Học thuật",
    },
  },
  {
    path: "/academic/resources/:id",
    element: <ResourceDetailPage />,
    layout: "admin",
    requiredPermissions: ["resource.view", "admin.resource.read"],
  },
  {
    path: "/academic/packs",
    element: <PackListPage />,
    layout: "admin",
    requiredPermissions: ["admin.pack.manage"],
    nav: { label: "Learning Pack", icon: <FolderOpenOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/packs/:id",
    element: <PackDetailPage />,
    layout: "admin",
    requiredPermissions: ["admin.pack.manage"],
  },
  {
    path: "/academic/quiz-bank",
    // Quiz bank host trợ giảng AI (sinh đề `AiExamGenerateModal` + phân tích độ khó
    // `AiDifficultyDrawer`, cả hai gác `ai.teacher.use` ở tầng nút). Giữ `admin.subject.read`
    // cho admin quản lý ngân hàng toàn hệ, nhưng OR thêm `ai.teacher.use` để GIẢNG VIÊN
    // (BE gác exam-generate/difficulty bằng đúng leaf này — JobController) vào được.
    element: <QuizBankPage />,
    layout: "admin",
    requiredPermissions: ["admin.subject.read", "ai.teacher.use"],
    nav: { label: "Quiz bank", icon: <QuestionCircleOutlined />, group: "Học thuật" },
  },
  {
    // KHO THỬ THÁCH toàn cục (change admin-challenge-bank-console): bề mặt DUY NHẤT làm việc được
    // với challenge mà KHÔNG phải bước vào một khoá — `GET /admin/challenges/bank` nhận courseId và
    // subjectId đều tuỳ chọn. Đây là chỗ nạp/phân loại đề PE của một môn (tag `PE` + mã môn).
    // Guard OR: ba leaf đầu là ĐÚNG tập mà BE `requireBankScope` coi là phạm vi GLOBAL (bỏ trống
    // courseId). Thêm `challenge.manage`/`course.manage` để người quản challenge/khoá vào được màn
    // và dùng nó ở chế độ CÓ lọc khoá — BE cho phép đúng như vậy (course-scoped manager phải truyền
    // courseId). Thiếu phạm vi toàn cục thì server trả 403 và trang hướng dẫn chọn khoá, KHÔNG đoán
    // trước ở client: grant scoped của CTV không nằm trong danh sách leaf global này.
    path: "/academic/challenge-bank",
    element: <ChallengeBankPage />,
    layout: "admin",
    requiredPermissions: [
      "admin.challenge.read",
      "admin.challenge.manage",
      "admin.course.manage",
      "challenge.manage",
      "course.manage",
    ],
    nav: { label: "Kho thử thách", icon: <DatabaseOutlined />, group: "Học thuật" },
  },
  {
    // Hàng đợi duyệt THỬ THÁCH. CỐ Ý KHÔNG khai `requiredPermissions`: quyền duyệt của CTV là grant
    // SCOPED theo môn, không phải leaf global trong `me.permissions` — gate bằng danh sách leaf sẽ
    // đá đúng người được giao việc sang /403. `GET /admin/challenges/review-queue` đã lọc theo phạm
    // vi duyệt phía server và trả trang RỖNG (không 403) cho người không có phạm vi, nên để server
    // quyết định. (Cùng bài học với `/academic/moderation`, nơi gate client-side từng ẩn mất nút
    // duyệt của CTV theo môn.)
    path: "/academic/challenge-review",
    element: <ChallengeReviewQueuePage />,
    layout: "admin",
    nav: {
      label: "Duyệt thử thách",
      icon: <SafetyCertificateOutlined />,
      group: "Học thuật",
    },
  },
  {
    path: "/academic/courses/:courseId/lessons/:lessonId",
    // Soạn bài học host trợ giảng AI soạn document (`LessonAiDraftPanel` trong
    // LessonContentEditor, gác `ai.teacher.use`). Giữ `admin.course.read` cho admin, OR thêm
    // `ai.teacher.use` để giảng viên soạn bài của mình vào được (BE LESSON_SUGGESTION → leaf này).
    element: <LessonEditPage />,
    layout: "admin",
    requiredPermissions: ["admin.course.read", "ai.teacher.use"],
  },
  {
    path: "/academic/ai-assist",
    element: <MentorConsolePage />,
    layout: "admin",
    requiredPermissions: ["ai.teacher.use"],
    nav: { label: "Trợ lý AI", icon: <RobotOutlined />, group: "Học thuật" },
  },
  {
    path: "/commerce",
    element: <CommerceLandingPage />,
    layout: "admin",
    requiredPermissions: ["admin.commerce.read"],
    nav: { label: "Thương mại", icon: <DollarOutlined />, group: "Thương mại" },
  },
  {
    path: "/commerce/orders",
    element: <OrderListPage />,
    layout: "admin",
    requiredPermissions: ["admin.commerce.read"],
    nav: { label: "Đơn hàng", icon: <ShoppingCartOutlined />, group: "Thương mại" },
  },
  {
    path: "/commerce/orders/:id",
    element: <OrderDetailPage />,
    layout: "admin",
    requiredPermissions: ["admin.commerce.read"],
  },
  {
    path: "/commerce/payments",
    element: <PaymentListPage />,
    layout: "admin",
    requiredPermissions: ["admin.commerce.read"],
    nav: { label: "Thanh toán", icon: <DollarOutlined />, group: "Thương mại" },
  },
  {
    path: "/commerce/payments/reconciliation",
    element: <ReconciliationPage />,
    layout: "admin",
    requiredPermissions: ["commerce.reconcile"],
    nav: { label: "Đối soát", icon: <DollarOutlined />, group: "Thương mại" },
  },
  {
    path: "/commerce/refunds",
    element: <RefundListPage />,
    layout: "admin",
    requiredPermissions: ["admin.commerce.read"],
    nav: { label: "Refund", icon: <DollarOutlined />, group: "Thương mại" },
  },
  {
    path: "/commerce/refunds/:id",
    element: <RefundDetailPage />,
    layout: "admin",
    requiredPermissions: ["admin.commerce.read"],
  },
  {
    path: "/commerce/wallets",
    element: <WalletLookupPage />,
    layout: "admin",
    requiredPermissions: ["wallet.read"],
    nav: { label: "Ví", icon: <WalletOutlined />, group: "Thương mại" },
  },
  {
    path: "/commerce/wallets/:userId",
    element: <WalletDetailPage />,
    layout: "admin",
    requiredPermissions: ["wallet.read"],
  },
  {
    path: "/commerce/coupons",
    element: <CouponListPage />,
    layout: "admin",
    requiredPermissions: ["admin.commerce.read"],
    nav: { label: "Coupon", icon: <DollarOutlined />, group: "Thương mại" },
  },
  {
    path: "/commerce/marketplace",
    element: <ProductListPage />,
    layout: "admin",
    requiredPermissions: ["admin.commerce.read"],
    nav: { label: "Marketplace", icon: <ShoppingCartOutlined />, group: "Thương mại" },
  },
  {
    path: "/moderation/queue",
    element: <ModerationQueuePage />,
    layout: "admin",
    requiredPermissions: ["admin.community.read"],
    nav: { label: "Moderation Queue", icon: <SafetyOutlined />, group: "Cộng đồng" },
  },
  {
    path: "/moderation/workflow",
    element: <WorkflowBoardPage />,
    layout: "admin",
    requiredPermissions: ["admin.workflow.read"],
    nav: { label: "Workflow", icon: <FileTextOutlined />, group: "Cộng đồng" },
  },
  {
    path: "/moderation/log",
    element: <ModerationLogPage />,
    layout: "admin",
    requiredPermissions: ["admin.community.read"],
    nav: { label: "Mod Log", icon: <AuditOutlined />, group: "Cộng đồng" },
  },
  {
    path: "/community/posts",
    element: <PostsPage />,
    layout: "admin",
    requiredPermissions: ["admin.community.read"],
    nav: { label: "Posts", icon: <CommentOutlined />, group: "Cộng đồng" },
  },
  {
    path: "/community/groups",
    element: <GroupsPage />,
    layout: "admin",
    requiredPermissions: ["group.manage", "admin.community.read"],
    nav: { label: "Groups", icon: <TeamOutlined />, group: "Cộng đồng" },
  },
  {
    path: "/community/groups/:groupId",
    element: <GroupDetailPage />,
    layout: "admin",
    requiredPermissions: ["group.manage", "admin.community.read"],
  },
  {
    path: "/community/campuses",
    element: <CampusListPage />,
    layout: "admin",
    requiredPermissions: ["community.campus.manage"],
    nav: { label: "Cơ sở", icon: <BankOutlined />, group: "Cộng đồng" },
  },
  {
    path: "/operations/notifications",
    element: <NotificationsPage />,
    layout: "admin",
    requiredPermissions: ["notification.manage"],
    nav: { label: "Broadcast", icon: <NotificationOutlined />, group: "Vận hành" },
  },
  {
    path: "/operations/banners",
    element: <BannersPage />,
    layout: "admin",
    requiredPermissions: ["admin.banner.read"],
    nav: { label: "Banners", icon: <NotificationOutlined />, group: "Vận hành" },
  },
  {
    path: "/operations/announcements",
    element: <AnnouncementsPage />,
    layout: "admin",
    requiredPermissions: ["admin.announcement.read"],
    nav: { label: "Announcements", icon: <NotificationOutlined />, group: "Vận hành" },
  },
  {
    path: "/operations/events",
    element: <EventsPage />,
    layout: "admin",
    requiredPermissions: ["event.manage", "admin.event.read"],
    nav: { label: "Events", icon: <ToolOutlined />, group: "Vận hành" },
  },
  {
    path: "/operations/events/:eventId",
    element: <EventDetailPage />,
    layout: "admin",
    requiredPermissions: ["event.manage", "admin.event.read"],
  },
  {
    path: "/operations/flags",
    element: <FlagsPage />,
    layout: "admin",
    requiredPermissions: ["admin.feature-flag.read"],
    nav: { label: "Feature Flags", icon: <SettingOutlined />, group: "Vận hành" },
  },
  {
    path: "/operations/config",
    element: <ConfigPage />,
    layout: "admin",
    requiredPermissions: ["admin.config.read"],
    nav: { label: "System Config", icon: <SettingOutlined />, group: "Vận hành" },
  },
  {
    path: "/content/blog",
    element: <BlogListPage />,
    layout: "admin",
    requiredPermissions: ["blog.manage"],
    nav: { label: "Blog", icon: <ReadOutlined />, group: "Nội dung" },
  },
  {
    path: "/content/blog/new",
    element: <BlogEditorPage />,
    layout: "admin",
    requiredPermissions: ["blog.manage"],
  },
  {
    path: "/content/blog/:id",
    element: <BlogEditorPage />,
    layout: "admin",
    requiredPermissions: ["blog.manage"],
  },
  {
    path: "/content/blog/:id/comments",
    element: <BlogCommentsPage />,
    layout: "admin",
    requiredPermissions: ["blog.manage"],
  },
  {
    path: "/ctv-program/invites",
    element: <InviteListPage />,
    layout: "admin",
    requiredPermissions: ["grant.view"],
    nav: { label: "CTV Invites", icon: <TeamOutlined />, group: "CTV" },
  },
  {
    path: "/ctv-program/invites/:inviteId",
    element: <InviteDetailPage />,
    layout: "admin",
    requiredPermissions: ["grant.view"],
  },
  {
    path: "/ctv-program/members",
    element: <MemberListPage />,
    layout: "admin",
    requiredPermissions: ["grant.view"],
    nav: { label: "CTV Members", icon: <TeamOutlined />, group: "CTV" },
  },
  {
    path: "/ctv-program/members/:memberId",
    element: <MemberDetailPage />,
    layout: "admin",
    requiredPermissions: ["grant.view"],
  },
  {
    path: "/ctv-program/performance",
    element: <TeamPerformancePage />,
    layout: "admin",
    requiredPermissions: ["grant.view"],
    nav: { label: "CTV Performance", icon: <TeamOutlined />, group: "CTV" },
  },
  {
    path: "/ctv",
    element: <WorkspaceHomePage />,
    layout: "admin",
    requiredScope: true,
    nav: { label: "CTV Workspace", icon: <TeamOutlined /> },
  },
  {
    path: "/ctv/onboarding/:token",
    element: <OnboardingPage />,
    layout: "none",
  },
  {
    path: "/ctv/groups/:groupId",
    element: <CtvGroupPage />,
    layout: "admin",
    requiredScope: true,
  },
  {
    path: "/ctv/resources",
    element: <CtvResourcePage />,
    layout: "admin",
    requiredScope: true,
  },
  {
    path: "/ctv/kpi",
    element: <CtvKpiPage />,
    layout: "admin",
    requiredScope: true,
  },
  {
    path: "/payroll",
    element: <PayrollListPage />,
    layout: "admin",
    // Console admin tổng: gate payroll.manage (chỉ ADMIN). KHÔNG payroll.read — LECTURER cũng có
    // payroll.read (để xem lương của mình ở /instructor/earnings) nên sẽ thấy nav "Lương" + vào
    // trang gọi API admin bị 403. Self-view của giảng viên đi qua /instructor/earnings (COURSE-scope).
    requiredPermissions: ["payroll.manage"],
    nav: { label: "Lương", icon: <WalletOutlined />, group: "Nhân sự" },
  },
  {
    path: "/question-banks",
    element: <QuestionBankListPage />,
    layout: "admin",
    // Kho câu hỏi: gate leaf `question.bank.manage` (ADMIN/SUPER_ADMIN + role staff, seed BE).
    // NavMenu tự ẩn nav khi thiếu leaf; PermissionRoute chặn route → /403.
    requiredPermissions: ["question.bank.manage"],
    nav: { label: "Kho câu hỏi", icon: <DatabaseOutlined />, group: "Nhân sự" },
  },
  {
    path: "/question-banks/:bankId",
    element: <QuestionBankDetailPage />,
    layout: "admin",
    requiredPermissions: ["question.bank.manage"],
  },
  {
    path: "/gamification/quests",
    element: <QuestsPage />,
    layout: "admin",
    requiredPermissions: ["gamification.admin.manage"],
    nav: { label: "Nhiệm vụ (Quest)", icon: <TrophyOutlined />, group: "Gamification" },
  },
  {
    path: "/gamification/xp-rules",
    element: <XpRulesPage />,
    layout: "admin",
    requiredPermissions: ["gamification.admin.manage"],
    nav: { label: "XP Rules", icon: <TrophyOutlined />, group: "Gamification" },
  },
  {
    path: "/gamification/reward-pools",
    element: <RewardPoolsPage />,
    layout: "admin",
    requiredPermissions: ["gamification.admin.manage"],
    nav: { label: "Reward Pools", icon: <TrophyOutlined />, group: "Gamification" },
  },
  {
    path: "/gamification/seasons",
    element: <SeasonsPage />,
    layout: "admin",
    requiredPermissions: ["gamification.admin.manage"],
    nav: { label: "Seasons", icon: <TrophyOutlined />, group: "Gamification" },
  },
  {
    path: "/gamification/xp-multiplier-events",
    element: <XpMultiplierEventsPage />,
    layout: "admin",
    requiredPermissions: ["gamification.admin.manage"],
    nav: { label: "Sự kiện nhân XP", icon: <TrophyOutlined />, group: "Gamification" },
  },
  // Analytics domain dashboards: concrete routes for nav + permission gating.
  {
    path: "/analytics/learning",
    element: <DomainDashboardPage />,
    layout: "admin",
    requiredPermissions: ["admin.analytics.read"],
    nav: { label: "Learning", icon: <ReadOutlined />, group: "Phân tích" },
  },
  {
    path: "/analytics/subject",
    element: <DomainDashboardPage />,
    layout: "admin",
    requiredPermissions: ["admin.analytics.read"],
    nav: { label: "Môn học", icon: <BookOutlined />, group: "Phân tích" },
  },
  {
    path: "/analytics/community",
    element: <DomainDashboardPage />,
    layout: "admin",
    requiredPermissions: ["admin.analytics.read"],
    nav: { label: "Cộng đồng", icon: <TeamOutlined />, group: "Phân tích" },
  },
  {
    path: "/analytics/ai",
    element: <DomainDashboardPage />,
    layout: "admin",
    requiredPermissions: ["admin.analytics.read"],
    nav: { label: "AI", icon: <RobotOutlined />, group: "Phân tích" },
  },
  {
    path: "/analytics/gamification",
    element: <DomainDashboardPage />,
    layout: "admin",
    requiredPermissions: ["admin.analytics.read"],
    nav: { label: "Gamification", icon: <TrophyOutlined />, group: "Phân tích" },
  },
  {
    path: "/analytics/business",
    element: <DomainDashboardPage />,
    layout: "admin",
    requiredPermissions: ["admin.analytics.read"],
    nav: { label: "Kinh doanh", icon: <DollarOutlined />, group: "Phân tích" },
  },
  // Catch-all parameterized route for direct navigation and unknown-domain handling.
  {
    path: "/analytics/:domain",
    element: <DomainDashboardPage />,
    layout: "admin",
  },
  {
    path: "/403",
    element: <ForbiddenPage />,
    layout: "admin",
  },
  {
    path: "/404",
    element: <NotFoundPage />,
    layout: "admin",
  },
  // Instructor workspace: console cho GIẢNG VIÊN key off OWNERSHIP (instructor_id). KHÔNG dùng
  // requiredScope: owner THUẦN (chỉ có instructor_id) có ZERO scoped grant — requiredScope sẽ đẩy
  // đúng persona này vào /403, làm cả rework ownership thành bất khả đạt. Nên rail gác bằng LEAF, còn
  // dữ liệu tự lọc/gác theo ownership qua /courses/teaching và /courses/{id}/manage (BE owner-authz).
  //
  // LEAF NÀO: khu KHOÁ HỌC gác `course.manage`, khu LƯƠNG gác `payroll.read`. Trước đây CẢ BỐN route
  // đều gác `payroll.read` — mượn tạm vì "LECTURER có leaf đó". Hệ quả: quyền xem LƯƠNG quyết định
  // việc giảng viên có sửa được KHOÁ của mình hay không. Hai hỏng thật đã gặp:
  //  1. Môi trường chưa chạy V261 (nơi cấp payroll.read) ⇒ giảng viên mất SẠCH: không khoá, không
  //     lương, không một dòng giải thích. Trong khi `course.manage` họ đã có từ V14 — cũ hơn nhiều.
  //  2. Ngày nào thu hồi quyền xem lương của một giảng viên là họ mất luôn quyền sửa khoá. Không ai
  //     đoán ra mối liên hệ đó khi đi tìm nguyên nhân.
  // requiredPermissions là phép HOẶC (hasAnyPermission), nên rail gốc nhận cả hai leaf: có bất kỳ
  // vai trò giảng viên nào cũng thấy rail, rồi từng trang tự gác đúng phần của nó.
  {
    path: "/instructor",
    element: <InstructorHomePage />,
    layout: "admin",
    requiredPermissions: ["course.manage", "payroll.read"],
    nav: { label: "Giảng viên", icon: <ReadOutlined /> },
  },
  {
    path: "/instructor/courses",
    element: <MyCoursesPage />,
    layout: "admin",
    // Khoá học của chính mình ⇒ leaf KHOÁ HỌC, không phải leaf lương. LECTURER có course.manage từ
    // V14; ownership do BE ép ở /courses/teaching + /courses/{id}/manage.
    requiredPermissions: ["course.manage"],
  },
  {
    path: "/instructor/courses/:courseId",
    element: <MyCourseDetailPage />,
    layout: "admin",
    // Khoá học của chính mình ⇒ leaf KHOÁ HỌC, không phải leaf lương. LECTURER có course.manage từ
    // V14; ownership do BE ép ở /courses/teaching + /courses/{id}/manage.
    requiredPermissions: ["course.manage"],
  },
  {
    path: "/instructor/earnings",
    element: <MyEarningsPage />,
    layout: "admin",
    // Lương của chính giảng viên: gate leaf payroll.read (LECTURER có; đọc self qua BE owner-JWT).
    requiredPermissions: ["payroll.read"],
  },
];
