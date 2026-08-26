import { useMemo, useState } from "react";
import { Alert, Input, Space, Tag, Typography, message } from "antd";
import type { CourseType } from "../../types";
import { useBulkEnrollByUsername, type BulkEnrollResult } from "../api/courses.api";
import { useCoursePackagePicker } from "./coursePackagePicker";

/** Tách chuỗi username phân tách bằng dấu phẩy (hoặc xuống dòng) → mảng đã trim, bỏ rỗng/trùng. */
export function parseUsernames(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const u = part.trim();
    if (!u || seen.has(u.toLowerCase())) continue;
    seen.add(u.toLowerCase());
    out.push(u);
  }
  return out;
}

/** Cấp thành công HẾT (không username nào hỏng)? */
export function isFullSuccess(result: BulkEnrollResult): boolean {
  return result.notFound.length === 0 && result.failed.length === 0;
}

interface BulkEnrollPanel {
  /** Nội dung panel (ô dán username + kết quả từng username) — nhét vào body Modal. */
  node: React.ReactNode;
  /** Gửi danh sách; `onAllDone` chỉ chạy khi cấp thành công HẾT (để modal tự đóng). */
  submit: (onAllDone?: () => void) => void;
  reset: () => void;
  isPending: boolean;
  /** Số username hợp lệ đang nhập — dùng cho nhãn nút + disable. */
  count: number;
  /** Chưa đủ điều kiện gửi (chưa nhập username, hoặc khoá bán theo gói mà chưa chọn gói). */
  disabled: boolean;
}

/** Điều kiện bật nút cấp — tách ra để test được mà không phải dựng cả modal. */
export function canSubmitBulkEnroll(usernameCount: number, packageBlocked: boolean): boolean {
  return usernameCount > 0 && !packageBlocked;
}

/**
 * Cụm "cấp học viên hàng loạt theo username" dùng chung cho tab Học viên và nút Cấp học viên ở danh
 * sách khoá — một hành vi duy nhất, không hai bản lệch nhau.
 *
 * Nguyên tắc báo lỗi (yêu cầu của chủ sản phẩm): hỏng MỘT username KHÔNG làm hỏng cả danh sách —
 * BE xử từng cái rồi trả {added, notFound, failed}. Thành công hết thì báo thành công; còn lại chỉ
 * nêu ĐÚNG username hỏng, các username khác vẫn đã được cấp.
 */
export function useBulkEnrollPanel(
  courseId: string | undefined,
  saleMode?: CourseType
): BulkEnrollPanel {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<BulkEnrollResult | null>(null);
  const bulk = useBulkEnrollByUsername(courseId);
  // Khoá bán theo gói: cấp mà không kèm gói thì học viên chỉ xem được bài học thử (quyền nằm ở gói).
  const picker = useCoursePackagePicker(courseId, { saleMode });
  const usernames = useMemo(() => parseUsernames(input), [input]);

  const reset = () => {
    setInput("");
    setResult(null);
    picker.reset();
  };

  const submit = (onAllDone?: () => void) => {
    if (usernames.length === 0) {
      message.info("Nhập ít nhất một username");
      return;
    }
    if (picker.blocked) {
      message.info("Khoá này bán theo gói — chọn gói trước khi cấp");
      return;
    }
    bulk.mutate({ usernames, packageId: picker.packageId }, {
      onSuccess: (res) => {
        setResult(res);
        if (isFullSuccess(res)) {
          message.success(`Đã cấp ${res.added.length} học viên vào khoá`);
          reset();
          onAllDone?.();
          return;
        }
        // Có username hỏng: nêu ĐÚNG username đó; số còn lại vẫn cấp thành công.
        const broken = [...res.notFound, ...res.failed.map((f) => f.username)];
        message.warning(
          `Đã cấp ${res.added.length} học viên. Không cấp được: ${broken.join(", ")}`
        );
      },
      onError: (err: Error) => message.error(err.message || "Cấp học viên thất bại"),
    });
  };

  const node = (
    <>
      {picker.node}
      <Typography.Paragraph type="secondary">
        Dán danh sách <strong>username</strong>, mỗi username cách nhau bằng dấu phẩy (hoặc xuống
        dòng). Username nào không cấp được sẽ được nêu riêng — các username còn lại vẫn được cấp.
      </Typography.Paragraph>
      <Input.TextArea
        rows={5}
        placeholder="vd: minh_dev, an.nguyen, tuanpham"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {usernames.length > 0 ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {usernames.length} username hợp lệ (đã bỏ trùng/rỗng).
        </Typography.Text>
      ) : null}

      {result ? (
        <div style={{ marginTop: 16 }}>
          {result.added.length > 0 ? (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 8 }}
              message={`Đã cấp ${result.added.length} học viên`}
              description={
                <Space size={[4, 4]} wrap>
                  {result.added.map((u) => (
                    <Tag key={u} color="green">
                      {u}
                    </Tag>
                  ))}
                </Space>
              }
            />
          ) : null}
          {result.notFound.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              message={`Không tìm thấy tài khoản (${result.notFound.length})`}
              description={
                <Space size={[4, 4]} wrap>
                  {result.notFound.map((u) => (
                    <Tag key={u}>{u}</Tag>
                  ))}
                </Space>
              }
            />
          ) : null}
          {result.failed.length > 0 ? (
            <Alert
              type="error"
              showIcon
              message={`Lỗi (${result.failed.length})`}
              description={
                <Space direction="vertical" size={2} style={{ width: "100%" }}>
                  {result.failed.map((f) => (
                    <Typography.Text key={f.username}>
                      <strong>{f.username}</strong>: {f.message}
                    </Typography.Text>
                  ))}
                </Space>
              }
            />
          ) : null}
        </div>
      ) : null}
    </>
  );

  return {
    node,
    submit,
    reset,
    isPending: bulk.isPending,
    count: usernames.length,
    disabled: !canSubmitBulkEnroll(usernames.length, picker.blocked),
  };
}
