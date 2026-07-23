/** Query-key factory cho kho câu hỏi (mirror `payroll.keys.ts`). Dùng cho cache + invalidation. */
export const questionBankKeys = {
  all: ["question-bank"] as const,
  lists: () => [...questionBankKeys.all, "list"] as const,
  details: () => [...questionBankKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...questionBankKeys.details(), id] as const) : questionBankKeys.details(),
};
