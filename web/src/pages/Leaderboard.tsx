import { A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import {
  LEADERBOARD_SCOPES, LEADERBOARD_WINDOWS, type LeaderboardOut, type LeaderboardRow, type LeaderboardScope, type LeaderboardWindow,
} from "../../../shared/api.ts";
import { api } from "../api.ts";
import { t } from "../i18n/index.ts";
import { displayName, lessonCount } from "../social.ts";

const WINDOWS = Object.keys(LEADERBOARD_WINDOWS) as LeaderboardWindow[];

/** Lessons completed in the past day, week or month, by everyone or by the learner and their friends. */
export function Leaderboard() {
  const [span, setSpan] = createSignal<LeaderboardWindow>("week");
  const [scope, setScope] = createSignal<LeaderboardScope>("everyone");
  const [board] = createResource(() => ({ window: span(), scope: scope() }),
    (q) => api.get<LeaderboardOut>(`/api/leaderboard?window=${q.window}&scope=${q.scope}`));

  return (
    <div class="d-flex flex-column gap-3">
      <h1 class="h3 mb-0">{t("leaderboard.title")}</h1>
      <div class="d-flex flex-wrap gap-2 justify-content-between">
        <div class="btn-group btn-group-sm" role="group">
          <For each={WINDOWS}>
            {(w) => (
              <button type="button" class={`qa-board-window-${w} btn btn-outline-primary`} classList={{ active: span() === w }}
                onClick={() => setSpan(w)}>{t(`leaderboard.${w}`)}</button>
            )}
          </For>
        </div>
        <div class="btn-group btn-group-sm" role="group">
          <For each={LEADERBOARD_SCOPES}>
            {(s) => (
              <button type="button" class={`qa-board-scope-${s} btn btn-outline-secondary`} classList={{ active: scope() === s }}
                onClick={() => setScope(s)}>{t(`leaderboard.${s}`)}</button>
            )}
          </For>
        </div>
      </div>
      <Show when={board.latest}>
        {(b) => (
          <Show when={b().rows.length > 0} fallback={<p class="qa-board-empty text-body-secondary mb-0">{t("leaderboard.empty")}</p>}>
            <ol class="qa-leaderboard list-group">
              <For each={b().rows}>{(row) => <Row row={row} />}</For>
            </ol>
            <Show when={b().me}>{(row) => <ol class="list-group"><Row row={row()} /></ol>}</Show>
          </Show>
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
      <Show when={r().isFriend}><span class="badge text-bg-light border">{t("leaderboard.friend")}</span></Show>
      <span class="qa-leader-lessons ms-auto text-body-secondary">{lessonCount(r().lessons)}</span>
    </li>
  );
}
