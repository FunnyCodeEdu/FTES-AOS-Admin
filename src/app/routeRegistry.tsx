import {
  AuditOutlined,
  BookOutlined,
  CommentOutlined,
  DollarOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HomeOutlined,
  NotificationOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  RobotOutlined,
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
import SubjectListPage from "../features/academic/subjects/pages/SubjectListPage";
import SubjectDetailPage from "../features/academic/subjects/pages/SubjectDetailPage";
import CategoryListPage from "../features/academic/categories/pages/CategoryListPage";
import CourseListPage from "../features/academic/courses/pages/CourseListPage";
import CourseDetailPage from "../features/academic/courses/pages/CourseDetailPage";
import ResourceListPage from "../features/academic/resources/pages/ResourceListPage";
import ResourceReviewQueuePage from "../features/academic/resources/pages/ResourceReviewQueuePage";
import ResourceDetailPage from "../features/academic/resources/pages/ResourceDetailPage";
import PackListPage from "../features/academic/packs/pages/PackListPage";
import PackDetailPage from "../features/academic/packs/pages/PackDetailPage";
import QuizBankPage from "../features/academic/quiz/pages/QuizBankPage";
import LessonEditPage from "../features/academic/lessons/pages/LessonEditPage";
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
import CommunityEventsPage from "../features/community/pages/CommunityEventsPage";
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
    path: "/academic/resources/review",
    element: <ResourceReviewQueuePage />,
    layout: "admin",
    requiredPermissions: ["resource.approve"],
    nav: { label: "Duyệt học liệu", icon: <FileTextOutlined />, group: "Học thuật" },
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
    element: <QuizBankPage />,
    layout: "admin",
    requiredPermissions: ["admin.subject.read"],
    nav: { label: "Quiz bank", icon: <QuestionCircleOutlined />, group: "Học thuật" },
  },
  {
    path: "/academic/courses/:courseId/lessons/:lessonId",
    element: <LessonEditPage />,
    layout: "admin",
    requiredPermissions: ["admin.course.read"],
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
    path: "/community/events",
    element: <CommunityEventsPage />,
    layout: "admin",
    requiredPermissions: ["admin.community.read"],
    nav: { label: "Events", icon: <TeamOutlined />, group: "Cộng đồng" },
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
];
