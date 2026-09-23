import { useParams } from "@solidjs/router";
import { LANGUAGES, type Language } from "../../../shared/content.ts";

/** The `:lang` route param; throws (to the error boundary) for an unsupported language. */
export function useLang(): () => Language {
  const params = useParams();
  return () => {
    const l = params.lang;
    if (!l || !(LANGUAGES as readonly string[]).includes(l)) throw new Error(`Unsupported language "${l}"`);
    return l as Language;
  };
}
