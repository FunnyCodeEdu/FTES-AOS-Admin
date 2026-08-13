# Báo cáo phân tích Permission Front-End

## 1. Inventory các hành động đặc quyền

| Hành động (nhãn nút/menu người dùng thấy) | Route/màn hình | Permission string dùng để ẩn/hiện | Lời gọi API (method + path) | File:dòng |
|---|---|---|---|---|
| Lưu | features/academic/challenge-bank/components/BankChallengeMetaModal.tsx | KHÔNG GATE | PATCH /challenges/... | BankChallengeMetaModal.tsx:101 |
| Thêm chỗ dùng | features/academic/challenge-bank/components/ChallengePlacementsModal.tsx | KHÔNG GATE | PUT /challenges/... | ChallengePlacementsModal.tsx:217 |
| Lưu tag | features/academic/challenge-bank/components/ChallengeTagsModal.tsx | KHÔNG GATE | PUT /challenges/... | ChallengeTagsModal.tsx:63 |
| Tạo đề vào kho | features/academic/challenge-bank/components/CreateBankChallengeModal.tsx | KHÔNG GATE | PUT /challenges/... | CreateBankChallengeModal.tsx:155 |
| Từ chối | features/academic/challenge-bank/components/RejectChallengeModal.tsx | KHÔNG GATE | POST /challenges/... | RejectChallengeModal.tsx:48 |
| Cấp quyền | features/academic/courses/components/GrantEnrollmentModal.tsx | KHÔNG GATE | POST /courses/... | GrantEnrollmentModal.tsx:67 |
| Sửa thử thách | features/academic/exercises/components/ChallengeEditModal.tsx | KHÔNG GATE | GET /challenges/... | ChallengeEditModal.tsx:440 |
| Lưu | features/academic/exercises/components/ChallengeEditModal.tsx | KHÔNG GATE | PUT /challenges/... | ChallengeEditModal.tsx:443 |
| Lưu test case | features/academic/exercises/components/TestCaseManagerDrawer.tsx | KHÔNG GATE | PUT /challenges/... | TestCaseManagerDrawer.tsx:209 |
| Tạo bài học | features/academic/lessons/components/NewLessonModal.tsx | KHÔNG GATE | POST /lessons | NewLessonModal.tsx:124 |
| Từ chối | features/academic/moderation/components/RejectResourceModal.tsx | KHÔNG GATE | POST /resources/... | RejectResourceModal.tsx:49 |
| Từ chối | features/academic/resources/pages/ResourceReviewQueuePage.tsx | KHÔNG GATE | POST /resources/... | ResourceReviewQueuePage.tsx:190 |
| Cập nhật | features/academic/subjects/components/SubjectInfoTab.tsx | KHÔNG GATE | PATCH /subjects/... | SubjectInfoTab.tsx:129 |
| Cấp quyền | features/academic/terms/components/TermReAddStudentModal.tsx | KHÔNG GATE | POST /terms/... | TermReAddStudentModal.tsx:67 |
| Từ chối | features/analytics/components/ContributionWidget.tsx | KHÔNG GATE | GET /analytics/contributions | ContributionWidget.tsx:121 |
| Chờ duyệt | features/analytics/components/ContributionWidget.tsx | KHÔNG GATE | GET /analytics/contributions | ContributionWidget.tsx:124 |
| Lưu | features/commerce/catalog/components/CouponFormModal.tsx | KHÔNG GATE | POST /coupons | CouponFormModal.tsx:78 |
| Lưu | features/commerce/catalog/components/ProductFormDrawer.tsx | KHÔNG GATE | POST /products | ProductFormDrawer.tsx:76 |
| Tạo yêu cầu | features/commerce/orders/components/RefundRequestButton.tsx | `commerce.refund.approve` | POST /refunds | RefundRequestButton.tsx:80 |
| Cập nhật | features/commerce/orders/pages/OrderDetailPage.tsx | KHÔNG GATE | PATCH /orders/... | OrderDetailPage.tsx:61 |
| Ghi chú duyệt | features/commerce/refunds/components/RefundActionPanel.tsx | `commerce.refund.approve` | PATCH /refunds/... | RefundActionPanel.tsx:159 |
| Huỷ sửa | features/content/blog/components/BlogCategoryModal.tsx | KHÔNG GATE | POST /blog/categories | BlogCategoryModal.tsx:96 |
| Lưu | features/content/blog/pages/BlogCommentsPage.tsx | KHÔNG GATE | PATCH /comments/... | BlogCommentsPage.tsx:262 |
| Từ chối | features/ctv-workspace/pages/CtvGroupPage.tsx | KHÔNG GATE | POST /community/posts/... | CtvGroupPage.tsx:97 |
| Lưu | features/gamification/components/QuestFormModal.tsx | KHÔNG GATE | POST /quests | QuestFormModal.tsx:104 |
| Lưu | features/gamification/components/RewardPoolFormModal.tsx | KHÔNG GATE | POST /reward-pools | RewardPoolFormModal.tsx:73 |
| Tạo season | features/gamification/components/SeasonFormModal.tsx | KHÔNG GATE | POST /seasons | SeasonFormModal.tsx:57 |
| Tạo | features/gamification/components/SeasonFormModal.tsx | KHÔNG GATE | POST /seasons | SeasonFormModal.tsx:61 |
| Lưu | features/gamification/components/XpRuleFormModal.tsx | KHÔNG GATE | POST /xp-rules | XpRuleFormModal.tsx:78 |
| Lưu | features/operations/components/ConfigDiffModal.tsx | KHÔNG GATE | PUT /configurations/... | ConfigDiffModal.tsx:33 |
| Lưu | features/operations/components/FlagEditModal.tsx | KHÔNG GATE | PUT /feature-flags/... | FlagEditModal.tsx:42 |
| Lưu | features/operations/pages/ConfigPage.tsx | KHÔNG GATE | PUT /configurations/... | ConfigPage.tsx:77 |
| Lưu | features/operations/pages/EventDetailPage.tsx | KHÔNG GATE | PATCH /events/... | EventDetailPage.tsx:361 |
| Đang chờ duyệt | features/payroll/pages/PayrollListPage.tsx | KHÔNG GATE | GET /payroll/list | PayrollListPage.tsx:246 |
| Tạo | features/question-bank/components/CreateBankModal.tsx | KHÔNG GATE | POST /banks | CreateBankModal.tsx:39 |
| Xác nhận lưu | features/rbac/pages/RoleEditorPage.tsx | KHÔNG GATE | PUT /roles/... | RoleEditorPage.tsx:61 |
| Gửi duyệt | features/operations/pages/EventDetailPage.tsx | event.manage | POST /events/... | EventDetailPage.tsx:215 |
| Sửa | features/operations/pages/EventDetailPage.tsx | event.manage | PATCH /events/... | EventDetailPage.tsx:218 |
| Sửa | features/rbac/pages/RoleListPage.tsx | admin.rbac.read | KHÔNG RÕ (Cần phân tích thủ công để bổ sung) | RoleListPage.tsx:76 |
| Lưu outcomes | features/academic/subjects/components/OutcomesTab.tsx | subject.manage | KHÔNG RÕ (Cần phân tích thủ công để bổ sung) | OutcomesTab.tsx:40 |
| Lưu prerequisites | features/academic/subjects/components/PrerequisitesTab.tsx | subject.manage | KHÔNG RÕ (Cần phân tích thủ công để bổ sung) | PrerequisitesTab.tsx:70 |
| Lưu thông tin | features/academic/subjects/components/SubjectInfoTab.tsx | subject.manage | KHÔNG RÕ (Cần phân tích thủ công để bổ sung) | SubjectInfoTab.tsx:115 |

## 2. Tên permission dùng ở FE

- **`subject.manage`**: Lưu outcomes (OutcomesTab.tsx), Lưu prerequisites (PrerequisitesTab.tsx), Lưu thông tin (SubjectInfoTab.tsx)
- **`commerce.refund.approve`**: Tạo yêu cầu refund (RefundRequestButton.tsx), Tạo yêu cầu (RefundRequestButton.tsx), Ghi chú duyệt (RefundActionPanel.tsx)
- **`event.manage`**: Gửi duyệt (EventDetailPage.tsx), Sửa (EventDetailPage.tsx)
- **`admin.rbac.read`**: Sửa (RoleListPage.tsx)

## 3. Hành động không gate

- **Lưu** tại `features/academic/challenge-bank/components/BankChallengeMetaModal.tsx` (BankChallengeMetaModal.tsx:101)
- **Thêm chỗ dùng** tại `features/academic/challenge-bank/components/ChallengePlacementsModal.tsx` (ChallengePlacementsModal.tsx:217)
- **Lưu tag** tại `features/academic/challenge-bank/components/ChallengeTagsModal.tsx` (ChallengeTagsModal.tsx:63)
- **Tạo đề vào kho** tại `features/academic/challenge-bank/components/CreateBankChallengeModal.tsx` (CreateBankChallengeModal.tsx:155)
- **Từ chối thử thách** tại `features/academic/challenge-bank/components/RejectChallengeModal.tsx` (RejectChallengeModal.tsx:40)
- **Từ chối** tại `features/academic/challenge-bank/components/RejectChallengeModal.tsx` (RejectChallengeModal.tsx:48)
- **Lưu** tại `features/academic/courses/components/CourseInfoTab.tsx` (CourseInfoTab.tsx:110)
- **Cấp quyền** tại `features/academic/courses/components/GrantEnrollmentModal.tsx` (GrantEnrollmentModal.tsx:67)
- **Sửa thử thách** tại `features/academic/exercises/components/ChallengeEditModal.tsx` (ChallengeEditModal.tsx:440)
- **Lưu** tại `features/academic/exercises/components/ChallengeEditModal.tsx` (ChallengeEditModal.tsx:443)
- **Tạo bài học** tại `features/academic/lessons/components/NewLessonModal.tsx` (NewLessonModal.tsx:124)
- **Từ chối học liệu** tại `features/academic/moderation/components/RejectResourceModal.tsx` (RejectResourceModal.tsx:41)
- **Từ chối** tại `features/academic/moderation/components/RejectResourceModal.tsx` (RejectResourceModal.tsx:49)
- **Từ chối học liệu** tại `features/academic/resources/pages/ResourceReviewQueuePage.tsx` (ResourceReviewQueuePage.tsx:182)
- **Từ chối** tại `features/academic/resources/pages/ResourceReviewQueuePage.tsx` (ResourceReviewQueuePage.tsx:190)
- **Cập nhật** tại `features/academic/subjects/components/SubjectInfoTab.tsx` (SubjectInfoTab.tsx:129)
- **Cấp quyền** tại `features/academic/terms/components/TermReAddStudentModal.tsx` (TermReAddStudentModal.tsx:67)
- **Lưu** tại `features/commerce/catalog/components/CouponFormModal.tsx` (CouponFormModal.tsx:78)
- **Cập nhật** tại `features/commerce/orders/pages/OrderDetailPage.tsx` (OrderDetailPage.tsx:61)
- **Huỷ sửa** tại `features/content/blog/components/BlogCategoryModal.tsx` (BlogCategoryModal.tsx:96)
- **Lưu** tại `features/content/blog/pages/BlogCommentsPage.tsx` (BlogCommentsPage.tsx:262)
- **Từ chối bài viết** tại `features/ctv-workspace/pages/CtvGroupPage.tsx` (CtvGroupPage.tsx:93)
- **Từ chối** tại `features/ctv-workspace/pages/CtvGroupPage.tsx` (CtvGroupPage.tsx:97)
- **Lưu** tại `features/gamification/components/QuestFormModal.tsx` (QuestFormModal.tsx:104)
- **Lưu** tại `features/gamification/components/RewardPoolFormModal.tsx` (RewardPoolFormModal.tsx:73)
- **Tạo season** tại `features/gamification/components/SeasonFormModal.tsx` (SeasonFormModal.tsx:57)
- **Tạo** tại `features/gamification/components/SeasonFormModal.tsx` (SeasonFormModal.tsx:61)
- **Lưu** tại `features/gamification/components/XpRuleFormModal.tsx` (XpRuleFormModal.tsx:78)
- **Lưu** tại `features/operations/components/ConfigDiffModal.tsx` (ConfigDiffModal.tsx:33)
- **Lưu** tại `features/operations/components/FlagEditModal.tsx` (FlagEditModal.tsx:42)
- **Lưu** tại `features/operations/pages/ConfigPage.tsx` (ConfigPage.tsx:77)
- **Lưu** tại `features/operations/pages/EventDetailPage.tsx` (EventDetailPage.tsx:361)
- **Tạo kho câu hỏi** tại `features/question-bank/components/CreateBankModal.tsx` (CreateBankModal.tsx:34)
- **Tạo** tại `features/question-bank/components/CreateBankModal.tsx` (CreateBankModal.tsx:39)
- **Xác nhận lưu** tại `features/rbac/pages/RoleEditorPage.tsx` (RoleEditorPage.tsx:61)

## 4. Gate không khớp nhau

- Permission `commerce.refund.approve` được dùng cho cả thao tác "Duyệt/Yêu cầu" (RefundRequestButton.tsx) và ghi chú duyệt. Cần review lại thiết kế để tách quyền hoặc gom hợp lý hơn.
- Không phát hiện tự động các gate không khớp khác.
- Phát hiện thủ công: Sửa Role gated bằng `admin.rbac.read` ở RoleListPage.tsx (Gate dùng quyền Read cho thao tác Write).

## 5. Không đọc được

- Các action dispatch thông qua hook ẩn (như zustand), custom hook ngoài thư mục, hoặc context.
- Một số popup/modal dùng chung không truyền permission từ trang gọi.
- Các action nằm trong cột bảng được truyền vào qua render callback có thể không được bao bọc trực tiếp bởi thẻ `<Can>`.
