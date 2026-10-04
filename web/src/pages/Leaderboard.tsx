import { A } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import { type LeaderboardOut, type LeaderboardRow } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { languageName, t } from "../i18n/index.ts";
import { LANGUAGE_FLAGS } from "../learning.ts";
import { displayName, lessonCount } from "../social.ts";

const duration = (seconds: number) => t("leaderboard.duration", { h: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60) });

/** This week's (Monday 00:00 UTC onward) lessons: your friends who practiced, then the top learners who show their profile, and you. */
export function Leaderboard() {
  const [board] = createResource(() => api.get<LeaderboardOut>("/api/leaderboard"));

  return (
    <div class="d-flex flex-column gap-3">
      <h1 class="h3 mb-0">{t("leaderboard.title")}</h1>
      <p class="qa-board-note text-body-secondary mb-0">
        {t("leaderboard.note")} <A href="/friends"><i class="bi bi-search me-1" aria-hidden="true" />{t("leaderboard.findFriends")}</A>
      </p>
      <Show when={board.latest}>
        {(b) => (
          <>
            <div class="qa-board-stats row g-2 text-center">
              <Stat cls="qa-board-stat-learners" value={String(b().stats.activeLearners)} label={t("leaderboard.statLearners")} />
              <Stat cls="qa-board-stat-lessons" value={String(b().stats.lessons)} label={t("leaderboard.statLessons")} />
              <Stat cls="qa-board-stat-time" value={duration(b().stats.seconds)} label={t("leaderboard.statTime")} />
            </div>
            <ol class="qa-leaderboard list-group">
              <For each={b().rows}>{(row) => <Row row={row} />}</For>
            </ol>
          </>
        )}
      </Show>
    </div>
  );
}

function Stat(props: { cls: string; value: string; label: string }) {
  return (
    <div class="col-4">
      <div class="card h-100 px-1 py-2">
        <div class={`${props.cls} fs-4 fw-semibold lh-1`}>{props.value}</div>
        <div class="small text-body-secondary mt-1">{props.label}</div>
      </div>
    </div>
  );
}

function Row(props: { row: LeaderboardRow }) {
  const r = () => props.row;
  return (
    <li class="qa-leader list-group-item d-flex align-items-center gap-2" classList={{ "list-group-item-primary": r().isMe }}>
      <span class="qa-leader-rank text-body-secondary flex-shrink-0" style={{ "min-width": "1.5rem" }}>{r().rank ?? "-"}</span>
      <div class="me-auto" style={{ "min-width": "0" }}>
        <A href={`/people/${r().person.id}`} class="qa-leader-link text-decoration-none fw-semibold">{displayName(r().person)}</A>
        <Show when={r().language}>{(l) => <div class="qa-leader-language small text-body-secondary">{LANGUAGE_FLAGS[l()]} {languageName(l())}</div>}</Show>
      </div>
      <div class="text-end flex-shrink-0">
        <div class="qa-leader-lessons">{lessonCount(r().lessonsWeek)}</div>
        <div class="qa-leader-all small text-body-secondary">{t("leaderboard.allTime", { n: r().lessonsAll })}</div>
      </div>
    </li>
  );
}
