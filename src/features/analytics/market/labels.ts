export const FEATURE_LABELS: Record<string, string> = {
  login: "Đăng nhập", registration: "Đăng ký", navigation: "Điều hướng", learning: "Học bài / xem video",
  courses: "Khóa học", workplace: "Workplace / học liệu", exam_practice: "Luyện đề FE / PE",
  ai: "Trợ lý AI", flashcards: "Flashcard", mindmap: "Sơ đồ tư duy", quiz: "Làm quiz",
  checkout: "Mua hàng / thanh toán", community: "Cộng đồng", events: "Sự kiện / contest",
  rewards: "Xu / thành tích", search: "Tìm kiếm", other: "Hoạt động khác",
};
export const featureLabel = (feature: string) => FEATURE_LABELS[feature] ?? feature;
export const PRODUCT_FEATURES = new Set(["learning","courses","workplace","exam_practice","ai","flashcards","mindmap","quiz","community","events","search"]);
const ACTION_LABELS: Record<string,string> = {
  "lesson.completed":"Hoàn thành bài học", "lesson.preview.started":"Xem thử bài học",
  "lesson.preview.limit_reached":"Dùng hết lượt xem thử", "course.enrolled":"Tham gia khóa học",
  "course.unenrolled":"Rời khóa học", "course.completed":"Hoàn thành khóa học",
  "course.enrollment.completed":"Hoàn tất chương trình học", "resource.downloaded":"Tải học liệu",
  "resource.fe.image.commented":"Bình luận đề FE", "resource.pe.submitted":"Gửi đề PE",
  "resource.pe.failed":"Xử lý đề PE chưa thành công", "challenge.submission.submitted":"Nộp bài thực hành",
  "challenge.submission.scored":"Nhận kết quả chấm bài", "challenge.completed":"Hoàn thành bài thực hành",
  "challenge.published":"Đăng đề thực hành", "challenge.updated":"Cập nhật đề thực hành",
  "challenge.reward.granted":"Nhận thưởng luyện tập", "challenge.lesson.attached":"Gắn bài thực hành vào bài học",
  "ai.job.completed":"Dùng công cụ AI", "ai.grading.completed":"Chấm bài bằng AI",
  "ai.studyplan.created":"Tạo lộ trình học AI", "community.post.created":"Đăng bài cộng đồng",
  "community.comment.created":"Bình luận cộng đồng", "community.reaction.added":"Thả cảm xúc",
  "community.user.followed":"Theo dõi người dùng", "community.post.shared":"Chia sẻ bài viết",
  "subject.member.joined":"Tham gia workplace môn học", "certificate.issued":"Nhận chứng chỉ",
  "identity.auth.login-succeeded":"Đăng nhập", "identity.user.registered":"Đăng ký tài khoản",
  "order.created":"Tạo đơn hàng", "order.paid":"Thanh toán thành công", "order.fulfilled":"Được cấp quyền khóa học",
  "page_view":"Xem trang", "feature_open":"Mở tính năng", "button_click":"Bấm nút",
  "link_click":"Bấm liên kết", "promotion_view":"Xem giới thiệu khóa học", "promotion_click":"Bấm giới thiệu khóa học",
  "coin.earned":"Nhận Xu", "coin.spent":"Sử dụng Xu", "coin.refunded":"Được hoàn Xu",
  "gamification.quest.completed":"Hoàn thành nhiệm vụ", "gamification.level.up":"Lên cấp",
  "gamification.badge.awarded":"Nhận huy hiệu", "gamification.streak.milestone":"Đạt mốc học liên tục",
};
const AI_LABELS: Record<string,string> = {
  SUMMARY:"Tóm tắt bằng AI", LESSON_SUMMARY:"Tóm tắt bài học AI", COURSE_SUMMARY:"Tóm tắt khóa học AI",
  TRANSCRIPT:"Tạo phụ đề / bản chép video", FLASHCARDS:"Tạo flashcard AI", QUIZ_GEN:"Tạo câu hỏi ôn tập AI",
  MINDMAP:"Tạo sơ đồ tư duy AI", AUTO_GRADING:"Chấm bài bằng AI", CV_REVIEW:"Đánh giá CV AI",
  INTERVIEW_COURSE:"Luyện phỏng vấn AI", STUDY_PLAN:"Lập kế hoạch học AI", CHAT:"Trò chuyện AI", PROJECT_GRADE:"Chấm dự án AI",
};
export function actionLabel(action: string): string {
  const [event,tool] = action.split(":");
  return tool && AI_LABELS[tool] ? AI_LABELS[tool] : ACTION_LABELS[event] ?? event;
}
export const numberLabel = (value: number | string) => Number(value ?? 0).toLocaleString("vi-VN");
export const moneyLabel = (value: number | string) => `${numberLabel(value)} ₫`;
export const timeLabel = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date(value));
