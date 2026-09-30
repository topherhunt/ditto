import { A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { LEADERBOARD_WINDOWS, type LeaderboardOut, type LeaderboardRow, type LeaderboardWindow } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { t } from "../i18n/index.ts";
import { displayName, lessonCount } from "../social.ts";
const WINDOWS = Object.keys(LEADERBOARD_WINDOWS) as LeaderboardWindow[];

/** Lessons completed in the past day, week or month by the learner and their friends. */
export function Leaderboard() {
  const [span, setSpan] = createSignal<LeaderboardWindow>("week");
  const [board] = createResource(span, (w) => api.get<LeaderboardOut>(`/api/leaderboard?window=${w}`));

  return (
    <div class="d-flex flex-column gap-3">
      <h1 class="h3 mb-0">{t("leaderboard.title")}</h1>
      <p class="qa-board-note text-body-secondary mb-0">
        {t("leaderboard.note")} <A href="/friends">{t("leaderboard.findFriends")}</A>
      </p>
      <div class="btn-group btn-group-sm align-self-start" role="group">
        <For each={WINDOWS}>
          {(w) => (
            <button type="button" class={`qa-board-window-${w} btn btn-outline-primary`} classList={{ active: span() === w }}
              onClick={() => setSpan(w)}>{t(`leaderboard.${w}`)}</button>
          )}
        </For>
      </div>
      <Show when={board.latest}>
        {(b) => (
          <>
            <ol class="qa-leaderboard list-group">
              <For each={b().rows}>{(row) => <Row row={row} />}</For>
            </ol>
            <Show when={b().me}>{(row) => <ol class="list-group"><Row row={row()} /></ol>}</Show>
          </>
        )}
      </Show>
    </div>
  );
}

function Row(props: { row: LeaderboardRow }) {
  const r = () => props.row;
  return (
    <li class="qa-leader list-group-item d-flex align-items-center gap-2" classList={{ "list-group-item-primary": r().isMe }}>
      <span class="qa-leader-rank text-body-secondary" style={{ width: "2rem" }}>{r().rank}</span>
      <A href={`/people/${r().person.id}`} class="qa-leader-link text-decoration-none fw-semibold">{displayName(r().person)}</A>
      <span class="qa-leader-lessons ms-auto text-body-secondary">{lessonCount(r().lessons)}</span>
    </li>
  );
}
