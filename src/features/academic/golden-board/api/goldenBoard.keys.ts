/** Cache key bảng vàng. Mọi thứ neo theo KỲ vì list là "các dòng của một kỳ". */
export const goldenBoardKeys = {
  all: ["admin", "golden-board"] as const,
  lists: () => [...goldenBoardKeys.all, "list"] as const,
  list: (termId: string | undefined) =>
    termId ? ([...goldenBoardKeys.lists(), termId] as const) : goldenBoardKeys.lists(),
};
