import { A } from "@solidjs/router";
import { createResource, Show } from "solid-js";
import { ADMIN_RECENT_DAYS, type AdminSummary, type Config } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { me } from "../session.ts";
import { usd } from "../spend.ts";
import { routes } from "../routes.ts";

// Admin-only, so English-only: these strings are not in the i18n dictionaries.

const n = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** A tile on the index: a title and, in grey, what's behind it. */
function Tile(props: { href: string; qa: string; icon: string; title: string; children: string | undefined }) {
  return (
    <div class="col-12 col-sm-6 col-md-4">
      <A href={props.href} class={`${props.qa} card hover-border h-100 text-decoration-none`}>
        <div class="card-body">
          <div class="fw-semibold text-body-emphasis"><i class={`bi ${props.icon} me-2`} aria-hidden="true" />{props.title}</div>
          <div class="qa-admin-tile-summary small text-body-secondary mt-1">{props.children ?? " "}</div>
        </div>
      </A>
    </div>
  );
}

/** The index of the operator pages, linked from the Account dropdown. */
export function Admin() {
  const [config] = createResource(() => api.get<Config>("/api/config"));
  const [summary] = createResource(() => me()?.admin, () => api.get<AdminSummary>("/api/admin/summary"));
  const s = () => summary();
  return (
    <Show when={me()?.admin} fallback={<div class="alert alert-danger">Admins only.</div>}>
      <h1 class="h4 mb-3">Admin</h1>
      <div class="row g-3">
        <Tile href={routes.adminUsers()} qa="qa-nav-users" icon="bi-people" title="Users">
          {s() && `${n(s()!.users, "account")}, ${s()!.usersSeenWeek} seen in the last 7 days`}
        </Tile>
        <Tile href={routes.adminMetrics()} qa="qa-nav-metrics" icon="bi-graph-up" title="Metrics">
          {s() && `${n(s()!.learnersToday, "learner")} today, ${usd(s()!.spendMonthUsd)} AI spend in ${ADMIN_RECENT_DAYS} days`}
        </Tile>
        <Tile href={routes.adminReports()} qa="qa-nav-reports" icon="bi-bug" title="Reports">
          {s() && `${s()!.reportsNew} new, ${s()!.reportsTriaged} triaged problem reports`}
        </Tile>
        <Tile href={routes.adminUserReports()} qa="qa-nav-user-reports" icon="bi-flag" title="People reports">
          {s() && `${s()!.peopleReportsOpen} open reports on learners`}
        </Tile>
        <Tile href={routes.adminFeedback()} qa="qa-nav-feedback" icon="bi-chat-heart" title="Feedback">
          {s() && `${s()!.feedbackOpen} unhandled`}
        </Tile>
        <Show when={config()?.poc}>
          <Tile href={routes.adminPronunciation()} qa="qa-nav-poc" icon="bi-mic" title="Pronunciation POC">Record correct and mispronounced takes</Tile>
        </Show>
        <Tile href={routes.adminSpeaking()} qa="qa-nav-speaking" icon="bi-chat-dots" title="Speaking">
          {s() && `${n(s()!.speakReports, "reported judgment")}, AI spend per learner`}
        </Tile>
      </div>
    </Show>
  );
}
