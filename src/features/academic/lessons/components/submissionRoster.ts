import type { StudentEmailView } from "../../courses/api/courses.api";
import type { ChallengeSubmissionSummary } from "../../challenge-bank/api/challengeBank.api";

export interface SubmissionRosterRow extends StudentEmailView {
  submitted: boolean;
  summary?: ChallengeSubmissionSummary;
  outsideCurrentRoster?: boolean;
}

/** Ghép roster hiện tại với dữ liệu nộp; giữ cả bài cũ của người đã rời khoá để không mất audit. */
export function mergeSubmissionRoster(
  students: StudentEmailView[],
  summaries: ChallengeSubmissionSummary[],
): SubmissionRosterRow[] {
  const byUser = new Map(summaries.map((item) => [item.userId, item]));
  const rows: SubmissionRosterRow[] = students.map((student) => ({
    ...student,
    submitted: byUser.has(student.userId),
    summary: byUser.get(student.userId),
  }));
  const rosterIds = new Set(students.map((student) => student.userId));
  for (const summary of summaries) {
    if (!rosterIds.has(summary.userId)) {
      rows.push({
        userId: summary.userId,
        username: summary.userId,
        email: "",
        submitted: true,
        summary,
        outsideCurrentRoster: true,
      });
    }
  }
  return rows;
}
