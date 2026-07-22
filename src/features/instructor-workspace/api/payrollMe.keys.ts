export const payrollMeKeys = {
  all: ["payroll", "me"] as const,
  earnings: () => [...payrollMeKeys.all, "earnings"] as const,
  current: () => [...payrollMeKeys.all, "current"] as const,
};
