"use client";

import { getLang, useLang } from "@/shared/lang";
import { type Lang, t as tables } from "./strings";

export type { Lang } from "./strings";
export { getLang, setLang, useLang } from "@/shared/lang";

export function useT() {
  return tables(useLang());
}

export function t(lang: Lang = getLang()) {
  return tables(lang);
}
