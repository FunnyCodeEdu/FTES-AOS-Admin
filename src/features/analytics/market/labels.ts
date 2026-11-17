export const FEATURE_LABELS: Record<string, string> = {
  login: "Đăng nhập", registration: "Đăng ký", navigation: "Điều hướng", learning: "Học bài / xem video",
  courses: "Khóa học", workplace: "Workplace / học liệu", exam_practice: "Luyện đề FE / PE",
  ai: "Trợ lý AI", flashcards: "Flashcard", mindmap: "Sơ đồ tư duy", quiz: "Làm quiz",
  checkout: "Mua hàng / thanh toán", community: "Cộng đồng", events: "Sự kiện / contest",
  rewards: "Xu / thành tích", search: "Tìm kiếm", other: "Hoạt động khác",
};
export const featureLabel = (feature: string) => FEATURE_LABELS[feature] ?? feature;
export const numberLabel = (value: number | string) => Number(value ?? 0).toLocaleString("vi-VN");
export const moneyLabel = (value: number | string) => `${numberLabel(value)} ₫`;
export const timeLabel = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date(value));
