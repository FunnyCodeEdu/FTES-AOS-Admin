export const payrollKeys = {
  all: ["admin", "payroll"] as const,
  lists: () => [...payrollKeys.all, "list"] as const,
  details: () => [...payrollKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...payrollKeys.details(), id] as const) : payrollKeys.details(),
};
