export type SupportedLang = "vi" | "en";

export const messages: Record<SupportedLang, Record<string, string>> = {
  vi: {
    "lesson.editor.title": "Soạn bài học",
    "lesson.editor.insertCut": "Chèn điểm cắt học thử",
    "lesson.editor.save": "Lưu",
    "lesson.editor.unsaved": "Bản nháp chưa lưu",
    "lesson.editor.source": "Source markdown",
    "lesson.editor.preview": "Preview",
    "lesson.editor.placeholder": "Viết nội dung markdown tại đây...",
    "lesson.editor.moveCutConfirm": "Di chuyển điểm cắt học thử",
    "lesson.editor.moveCutDesc":
      "Đã có một điểm cắt trong bài. Bạn muốn di chuyển điểm cắt đến vị trí con trỏ?",
    "lesson.editor.moveCutOk": "Di chuyển",
    "lesson.editor.wrongType":
      "Loại bài học không hỗ trợ nội dung markdown (LESSON_TYPE_MISMATCH)",
    "lesson.editor.saveSuccess": "Đã lưu nội dung bài học",
    "lesson.preview.title": "Thởi lượng học thử",
    "lesson.preview.placeholder": "Mặc định khoá học: {value}",
    "lesson.preview.disable": "Tắt học thử cho bài này",
    "lesson.preview.hint":
      "Để trống để kế thừa mặc định khoá học. Nhập 00:00 hoặc tick \"Tắt\" để tắt.",
    "lesson.preview.invalidFormat": "Định dạng phải là mm:ss",
    "lesson.preview.exceedsDuration": "Thởi lượng học thử không được vượt quá {value}",
    "lesson.preview.saveSuccess": "Đã lưu cấu hình học thử",
    "course.previewDefault.title": "Học thử mặc định cho video",
    "course.previewDefault.description":
      "Mặc định áp dụng cho các bài VIDEO khi không được ghi đè từng bài.",
    "course.previewDefault.confirm": "Đổi học thử mặc định",
    "course.previewDefault.confirmDesc":
      "Thay đổi này áp dụng cho tất cả bài VIDEO chưa ghi đè thởi lượng học thử.",
    "course.previewDefault.saveSuccess": "Đã lưu học thử mặc định",
    "common.save": "Lưu",
    "common.cancel": "Huỷ",
    "common.confirm": "Xác nhận",
  },
  en: {
    "lesson.editor.title": "Edit lesson",
    "lesson.editor.insertCut": "Insert preview cut-point",
    "lesson.editor.save": "Save",
    "lesson.editor.unsaved": "Unsaved draft",
    "lesson.editor.source": "Source markdown",
    "lesson.editor.preview": "Preview",
    "lesson.editor.placeholder": "Write markdown content here...",
    "lesson.editor.moveCutConfirm": "Move preview cut-point",
    "lesson.editor.moveCutDesc":
      "A cut-point already exists. Do you want to move it to the cursor position?",
    "lesson.editor.moveCutOk": "Move",
    "lesson.editor.wrongType":
      "This lesson type does not support markdown content (LESSON_TYPE_MISMATCH)",
    "lesson.editor.saveSuccess": "Lesson content saved",
    "lesson.preview.title": "Preview duration",
    "lesson.preview.placeholder": "Course default: {value}",
    "lesson.preview.disable": "Disable preview for this lesson",
    "lesson.preview.hint":
      "Leave empty to inherit course default. Enter 00:00 or check \"Disable\" to turn off.",
    "lesson.preview.invalidFormat": "Format must be mm:ss",
    "lesson.preview.exceedsDuration": "Preview duration must not exceed {value}",
    "lesson.preview.saveSuccess": "Preview config saved",
    "course.previewDefault.title": "Default video preview",
    "course.previewDefault.description":
      "Default applied to VIDEO lessons without per-lesson override.",
    "course.previewDefault.confirm": "Change default preview",
    "course.previewDefault.confirmDesc":
      "This affects all VIDEO lessons that have not overridden preview duration.",
    "course.previewDefault.saveSuccess": "Default preview saved",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
  },
};

export function getMessage(lang: SupportedLang, key: string, params?: Record<string, string>): string {
  let text = messages[lang][key] ?? messages.vi[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
}
