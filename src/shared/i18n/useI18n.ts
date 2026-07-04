import { useMemo } from "react";
import { getMessage, type SupportedLang } from "./messages";

export function useI18n(lang: SupportedLang = "vi") {
  return useMemo(
    () => ({
      t: (key: string, params?: Record<string, string>) => getMessage(lang, key, params),
      lang,
    }),
    [lang]
  );
}
