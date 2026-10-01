import { A } from "@solidjs/router";
import { createSignal } from "solid-js";
import { QUIZ_TEST_SIZE } from "../../../shared/api.ts";
import { t } from "../i18n/index.ts";
import { Popup } from "./Popup.tsx";

/** A test-out button and the pop-up that explains the stakes before the test starts. `kind` picks the Type (dictation) or Quiz wording; `class` carries the button's `qa-*` and size classes. */
export function TestOutButton(props: { kind: "type" | "quiz"; href: string; level: string; label: string; class: string }) {
  const [open, setOpen] = createSignal(false);
  const vars = () => ({ level: props.level, n: QUIZ_TEST_SIZE });
  return (
    <>
      <button type="button" class={`btn btn-outline-primary ${props.class}`} onClick={() => setOpen(true)}>{props.label}</button>
      <Popup open={open()} onClose={() => setOpen(false)} title={t(`testOut.${props.kind}Title`, vars())} class="qa-testout-popup"
        closeLabel={t("quiz.dismiss")} centerFooter
        footer={<A href={props.href} class="qa-testout-go btn btn-primary"><span aria-hidden="true">▶</span> {t("popup.letsGo")}</A>}>
        <ul class="mb-0 d-flex flex-column gap-2">
          <li>{t(`testOut.${props.kind}How`, vars())}</li>
          <li>{t("testOut.stakes")}</li>
          <li>{t(`testOut.${props.kind}Reward`, vars())}</li>
        </ul>
      </Popup>
    </>
  );
}
