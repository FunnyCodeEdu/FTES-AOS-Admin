import { describe, expect, it } from "vitest";
import { mapOrder, type AdminOrderDto } from "./orders.api";

describe("admin order mapping", () => {
  it("keeps customer, line items and actual paid amount", () => {
    const dto: AdminOrderDto = {
      id: "order-1",
      buyerId: "buyer-1",
      buyerName: "nguyenvana",
      buyerEmail: "a@example.com",
      amount: 359_050,
      paidAmount: 359_050,
      discountAmount: 39_950,
      coinApplied: "0",
      coinDiscountVnd: 0,
      payMethod: "VIETQR",
      legacy: false,
      status: "SUCCESS",
      createdAt: "2026-09-10T16:12:16Z",
      paidAt: "2026-09-10T16:12:38Z",
      items: [{
        id: "line-1",
        productName: "Khoá LAB211",
        productType: "COURSE_UNLOCK",
        unitAmount: 399_000,
        quantity: 1,
        totalAmount: 399_000,
        fulfillmentStatus: "DONE",
      }],
      payments: [{
        id: "intent-1",
        gateway: "VIETQR",
        amount: 359_050,
        status: "INITIATED",
        createdAt: "2026-09-10T16:12:16Z",
      }, {
        id: "payment-1",
        gateway: "VIETQR",
        amount: 359_050,
        status: "SUCCEEDED",
        txnRef: "bank-ref-1",
        bankName: "BIDV",
        createdAt: "2026-09-10T16:12:38Z",
        confirmedAt: "2026-09-10T16:12:38Z",
      }],
    };

    const order = mapOrder(dto);

    expect(order.buyerName).toBe("nguyenvana");
    expect(order.buyerEmail).toBe("a@example.com");
    expect(order.paidAmount).toBe(359_050);
    expect(order.items[0]?.productName).toBe("Khoá LAB211");
    expect(order.payments).toHaveLength(2);
    expect(order.paymentTimeline.map((event) => event.event)).toEqual([
      "created", "webhook_received", "matched",
    ]);
  });
});
