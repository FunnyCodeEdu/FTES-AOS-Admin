import { describe, expect, it } from "vitest";
import { mergeSubmissionRoster } from "./submissionRoster";
import type { ChallengeSubmissionSummary } from "../../challenge-bank/api/challengeBank.api";

const summary = (userId: string): ChallengeSubmissionSummary => ({
  userId,
  attemptCount: 2,
  latestSubmissionId: `submission-${userId}`,
  latestAttemptNo: 2,
  latestStatus: "SCORED",
  latestScore: 8,
  bestScore: 9,
  latestPayloadType: "CODE",
  lastSubmittedAt: "2026-09-16T00:00:00Z",
});

describe("mergeSubmissionRoster", () => {
  it("đánh dấu đủ học viên đã nộp và chưa nộp", () => {
    const rows = mergeSubmissionRoster(
      [
        { userId: "u1", username: "An", email: "an@example.com" },
        { userId: "u2", username: "Binh", email: "binh@example.com" },
      ],
      [summary("u1")],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ userId: "u1", submitted: true, summary: { attemptCount: 2 } });
    expect(rows[1]).toMatchObject({ userId: "u2", submitted: false });
  });

  it("không làm mất bài nộp cũ của học viên đã rời roster", () => {
    const rows = mergeSubmissionRoster([], [summary("former-user")]);
    expect(rows).toEqual([
      expect.objectContaining({
        userId: "former-user",
        submitted: true,
        outsideCurrentRoster: true,
      }),
    ]);
  });
});
