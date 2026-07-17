export const challengeBankKeys = {
  all: ["admin", "challenge-bank"] as const,
  course: (courseId: string | undefined) =>
    [...challengeBankKeys.all, courseId] as const,
};
