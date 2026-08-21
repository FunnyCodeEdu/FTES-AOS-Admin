import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { subjectsKeys } from "./subjects.keys";

/**
 * Bộ thẻ ghi nhớ của MÔN — sống ở service Workspace, không phải dưới `/admin`, nên gọi bằng
 * `coreClient` (`/api/v1/subjects/{code}/practice/flashcards`). Quyền là quyền CURATE môn;
 * tài khoản admin đã có sẵn nên không cần endpoint admin riêng.
 */
export interface AdminFlashcardCard {
  id: string;
  front: string;
  back: string;
  sortOrder: number;
}

export interface AdminFlashcardDeck {
  id: string;
  subjectCode: string;
  title: string;
  description?: string | null;
  visibility: string;
  status: string;
  /**
   * TỔNG số thẻ thật của bộ. Khác `cards.length` khi người đọc chưa có gói — nhưng ở màn admin
   * thì trùng nhau, vì người curate luôn đọc đủ.
   */
  cardCount: number;
  accessTier: "FREE" | "PREMIUM" | string;
  locked: boolean;
  previewLimit: number;
  cards: AdminFlashcardCard[];
}

export interface AdminFlashcardDecks {
  subjectCode: string;
  deckCount: number;
  totalCards: number;
  canManage: boolean;
  hasFullAccess: boolean;
  decks: AdminFlashcardDeck[];
}

/** Payload tạo bộ mới; `cards` gửi kèm ngay trong một request (BE nhận tối đa 500 thẻ). */
export interface CreateDeckPayload {
  title: string;
  description?: string;
  visibility?: string;
  status?: string;
  accessTier?: string;
  previewLimit?: number;
  cards?: Array<{ front: string; back: string }>;
}

export type UpdateDeckPayload = Partial<Omit<CreateDeckPayload, "cards">>;

const decksKey = (code: string | undefined) =>
  [...subjectsKeys.all, "flashcards", code] as const;

export function useSubjectFlashcards(code: string | undefined) {
  return useQuery({
    queryKey: decksKey(code),
    enabled: Boolean(code),
    queryFn: () =>
      coreClient
        .get(`/subjects/${code}/practice/flashcards`)
        .then((r) => r.data as AdminFlashcardDecks),
  });
}

export function useCreateFlashcardDeck(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<AdminFlashcardDeck, Error, CreateDeckPayload>({
    mutationFn: (payload) =>
      coreClient
        .post(`/subjects/${code}/practice/flashcards/decks`, payload)
        .then((r) => r.data as AdminFlashcardDeck),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: decksKey(code) });
    },
    onError: handleAdminMutationError,
  });
}

export function useUpdateFlashcardDeck(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<AdminFlashcardDeck, Error, { deckId: string; values: UpdateDeckPayload }>({
    mutationFn: ({ deckId, values }) =>
      coreClient
        .patch(`/subjects/${code}/practice/flashcards/decks/${deckId}`, values)
        .then((r) => r.data as AdminFlashcardDeck),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: decksKey(code) });
    },
    onError: handleAdminMutationError,
  });
}

export function useDeleteFlashcardDeck(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (deckId) =>
      coreClient
        .delete(`/subjects/${code}/practice/flashcards/decks/${deckId}`)
        .then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: decksKey(code) });
    },
    onError: handleAdminMutationError,
  });
}

export function useAddFlashcardCards(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    AdminFlashcardCard[],
    Error,
    { deckId: string; cards: Array<{ front: string; back: string }> }
  >({
    mutationFn: ({ deckId, cards }) =>
      coreClient
        .post(`/subjects/${code}/practice/flashcards/decks/${deckId}/cards`, { cards })
        .then((r) => r.data as AdminFlashcardCard[]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: decksKey(code) });
    },
    onError: handleAdminMutationError,
  });
}

export function useDeleteFlashcardCard(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (cardId) =>
      coreClient
        .delete(`/subjects/${code}/practice/flashcards/cards/${cardId}`)
        .then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: decksKey(code) });
    },
    onError: handleAdminMutationError,
  });
}
