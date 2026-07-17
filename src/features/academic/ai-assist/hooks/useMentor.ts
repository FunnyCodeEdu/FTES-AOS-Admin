// Hook mutation cho 3 endpoint mentor sync (POST /ai/mentor/*). Không cache (mỗi lần submit là
// một lượt sinh mới) → dùng useMutation, trạng thái loading/error/data quản ngay trong hook.
//
// Lỗi: interceptor ném ApiError (403 thiếu quyền, 400 AI_MENTOR_INVALID input rỗng/quá dài,
// 5xx provider). Page map code → message tiếng Việt rõ.

import { useMutation } from "@tanstack/react-query";
import { mentorCohortInsight, mentorFeedbackAssist, mentorStudentBrief } from "../api";
import type {
  MentorCohortInsightRequest,
  MentorFeedbackAssistRequest,
  MentorResult,
  MentorStudentBriefRequest,
} from "../types";

export function useMentorStudentBrief() {
  return useMutation<MentorResult, Error, MentorStudentBriefRequest>({
    mutationFn: mentorStudentBrief,
  });
}

export function useMentorFeedbackAssist() {
  return useMutation<MentorResult, Error, MentorFeedbackAssistRequest>({
    mutationFn: mentorFeedbackAssist,
  });
}

export function useMentorCohortInsight() {
  return useMutation<MentorResult, Error, MentorCohortInsightRequest>({
    mutationFn: mentorCohortInsight,
  });
}
