export const payrollMeKeys = {
  all: ["payroll", "me"] as const,
  earnings: () => [...payrollMeKeys.all, "earnings"] as const,
  current: () => [...payrollMeKeys.all, "current"] as const,
  detail: (id: string | undefined) => [...payrollMeKeys.all, "detail", id] as const,
};
