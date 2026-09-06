import type { StudentEmailRow } from "./types";

/**
 * Dựng nội dung CSV và danh sách mail để copy — thuần, không chạm DOM.
 *
 * <p>Tách khỏi component vì đây là phần dễ sai và đáng test: một dấu phẩy trong tên khoá không được
 * phép làm lệch cả cột, và danh sách gửi thư không được đếm trùng một người thành hai.
 */

/**
 * Bọc một ô CSV. Excel hiểu dấu ngoặc kép đôi là ký tự ngoặc kép trong nội dung.
 *
 * <p>Luôn bọc mọi ô thay vì chỉ bọc ô "có ký tự đặc biệt": tên khoá tiếng Việt thường chứa dấu phẩy
 * ("PRF192/PRF193 - Nhập môn lập trình C/C++, cơ bản"), và một ô sót sẽ đẩy toàn bộ các cột sau nó
 * sang phải — hỏng âm thầm, chỉ lộ ra khi ai đó đọc nhầm cột.
 */
function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const HEADERS = [
  "email",
  "ho_ten",
  "ma_khoa",
  "ten_khoa",
  "goi",
  "trang_thai",
  "nguon",
  "ngay_tham_gia",
];

/** Ngày theo giờ VN, dạng yyyy-mm-dd. Rỗng khi BE không có mốc. */
function vnDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

export function buildEmailCsv(rows: StudentEmailRow[]): string {
  const lines = [HEADERS.map(cell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.email,
        r.username,
        r.courseCode ?? "",
        r.courseTitle,
        r.packageName ?? "",
        r.active ? "đang học" : "đã dừng",
        r.source === "PACKAGE" ? "mua gói" : "ghi danh",
        vnDate(r.joinedAt),
      ]
        .map(cell)
        .join(","),
    );
  }
  // BOM để Excel trên Windows đọc đúng tiếng Việt — thiếu nó thì file mở ra toàn ký tự hỏng.
  return `﻿${lines.join("\r\n")}`;
}

/**
 * Danh sách mail duy nhất để dán vào ô BCC. Không phân biệt hoa thường và giữ nguyên thứ tự gặp
 * đầu tiên — gửi hai lần cho cùng một người là lỗi người nhận nhìn thấy được.
 */
export function uniqueEmails(rows: StudentEmailRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const email = r.email?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}
