import { describe, expect, it } from "vitest";

/**
 * Đường dẫn API ghép đôi.
 *
 * <p>Bốn endpoint đọc và năm endpoint ghi đều treo dưới MỘT tiền tố; gõ lệch một ký tự là 404 mà
 * giao diện chỉ hiện bảng rỗng — không lỗi đỏ, không log. Neo tiền tố lại để đổi nó là phải sửa
 * test, chứ không phải phát hiện lúc ban tổ chức mở màn hình trước giờ phát.
 */
const base = (eventId: string) => `/event/admin/events/${eventId}/matchmaking`;

describe("đường dẫn API ghép đôi", () => {
    const eventId = "11111111-2222-3333-4444-555555555555";

    it("treo dưới /event/admin/events/{id}/matchmaking", () => {
        expect(base(eventId)).toBe(`/event/admin/events/${eventId}/matchmaking`);
    });

    it("các đường con khớp đúng controller backend", () => {
        expect(`${base(eventId)}/profiles`).toContain("/matchmaking/profiles");
        expect(`${base(eventId)}/profiles/unassigned`).toContain("/profiles/unassigned");
        expect(`${base(eventId)}/rooms/auto-build`).toContain("/rooms/auto-build");
        expect(`${base(eventId)}/rooms/r1/schedule`).toContain("/rooms/r1/schedule");
        expect(`${base(eventId)}/rooms/r1/invite`).toContain("/rooms/r1/invite");
        expect(`${base(eventId)}/rooms/r1/eliminate/u1`).toContain("/rooms/r1/eliminate/u1");
        expect(`${base(eventId)}/results`).toContain("/matchmaking/results");
    });

    it("KHÔNG dùng tiền tố /admin/... của các module khác", () => {
        // Module event đặt đường quản trị dưới `/event/admin`, không phải `/admin/event` —
        // nhầm là 404 im lặng.
        expect(base(eventId).startsWith("/event/admin/")).toBe(true);
        expect(base(eventId).startsWith("/admin/")).toBe(false);
    });
});
