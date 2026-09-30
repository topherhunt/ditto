import { A } from "@solidjs/router";
import type { Language } from "../../../shared/content.ts";
import { t } from "../i18n/index.ts";
import { LANGUAGE_FLAGS } from "../learning.ts";

/** The breadcrumb back to a language's typing catalog, for the pages that live under it. */
export function TypeCrumb(props: { lang: Language; class?: string }) {
  return <A href={`/${props.lang}/type`} class={`qa-type-crumb small ${props.class ?? ""}`}>← {LANGUAGE_FLAGS[props.lang]} {t("activity.type")}</A>;
}
