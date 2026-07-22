/**
 * Ngưỡng thực nhận tối thiểu để giảng viên yêu cầu chi trả (VND). Hằng số FE, đặt khớp
 * mặc định BE (`config.minPayout`); BE `PAYROLL_BALANCE_NOT_ENOUGH` (400) là chốt chặn cuối,
 * nên đây chỉ để gate/gợi ý ở UI. Nếu BE đổi minPayout, cập nhật hằng số này cho khớp.
 */
export const MIN_PAYOUT = 50000;
