import { A } from "@solidjs/router";
import { createResource, createSignal, For, Match, Show, Switch } from "solid-js";
import {
  RACE_DAYS, RACE_DEADLINE_DAYS, RACE_MIN_TARGET,
  type ChallengeBody, type ChallengeOut, type FriendSearchOut, type FriendsOut, type Person, type Relation,
} from "../../../shared/api.ts";
import { api } from "../api.ts";
import type { Key } from "../i18n/en.ts";
import { t } from "../i18n/index.ts";
import { dayCount, daysLeft, displayName, raceLabel } from "../social.ts";

/** What a search says about an account; `none` and `incoming` show a button instead. */
const SEARCH_RESULT: Record<Exclude<Relation, "none" | "incoming">, Key> = {
  self: "friends.self",
  outgoing: "friends.sent",
  friends: "friends.already",
  blocked: "friends.blockedThem",
};

export function Friends() {
  const [friends, { refetch: refetchFriends }] = createResource(() => api.get<FriendsOut>("/api/friends"));
  const [races, { refetch: refetchRaces }] = createResource(() => api.get<ChallengeOut[]>("/api/challenges"));
  const refresh = () => Promise.all([refetchFriends(), refetchRaces()]);

  const [email, setEmail] = createSignal("");
  const [found, setFound] = createSignal<FriendSearchOut | null>(null);
  async function search(e: SubmitEvent) {
    e.preventDefault();
    setFound(await api.get<FriendSearchOut>(`/api/friends/search?email=${encodeURIComponent(email().trim())}`));
  }
  async function request() {
    const { relation } = await api.post<{ relation: Relation }>("/api/friends/requests", { email: email().trim() });
    setFound({ ...(found() as Extract<FriendSearchOut, { found: true }>), relation });
    await refresh();
  }
  const act = async (id: number, action: string) => {
    await api.post(`/api/friends/${id}/${action}`);
    await refresh();
  };
  const raceAct = async (id: number, action: string) => {
    await api.post(`/api/challenges/${id}/${action}`);
    await refresh();
  };

  return (
    <div class="d-flex flex-column gap-4">
      <h1 class="h3 mb-0">{t("friends.title")}</h1>

      <section class="card"><div class="card-body d-flex flex-column gap-2">
        <h2 class="h5 mb-0">{t("friends.add")}</h2>
        <form class="d-flex gap-2" onSubmit={search}>
          <input type="email" required class="qa-friend-email form-control" placeholder={t("friends.emailPlaceholder")} value={email()}
            onInput={(e) => { setEmail(e.currentTarget.value); setFound(null); }} />
          <button type="submit" class="qa-friend-search btn btn-primary">{t("friends.find")}</button>
        </form>
        <Show when={found()}>
          {(f) => (
            <div class="qa-friend-result">
              <Switch>
                <Match when={!f().found}><span class="text-body-secondary">{t("friends.noAccount")}</span></Match>
                <Match when={f().found && (f() as { relation: Relation }).relation}>
                  {(rel) => (
                    <Switch fallback={<span class="text-body-secondary">{t(SEARCH_RESULT[rel() as keyof typeof SEARCH_RESULT])}</span>}>
                      <Match when={rel() === "none"}>
                        <button type="button" class="qa-friend-add btn btn-success" onClick={request}>{t("friends.send")}</button>
                      </Match>
                      <Match when={rel() === "incoming"}>
                        <button type="button" class="qa-friend-add btn btn-success" onClick={request}>{t("friends.acceptTheirs")}</button>
                      </Match>
                    </Switch>
                  )}
                </Match>
              </Switch>
            </div>
          )}
        </Show>
      </div></section>

      <Show when={friends()}>
        {(f) => (
          <>
            <Show when={f().incoming.length > 0}>
              <section class="d-flex flex-column gap-2">
                <h2 class="h5 mb-0">{t("friends.requests")}</h2>
                <For each={f().incoming}>
                  {(p) => (
                    <div class="qa-incoming card"><div class="card-body d-flex flex-wrap align-items-center gap-2">
                      <PersonLabel person={p} />
                      <button type="button" class="qa-accept btn btn-sm btn-success" onClick={() => act(p.id, "accept")}>{t("friends.accept")}</button>
                      <button type="button" class="qa-decline btn btn-sm btn-outline-secondary" onClick={() => act(p.id, "decline")}>{t("friends.decline")}</button>
                      <button type="button" class="qa-block btn btn-sm btn-outline-danger" title={t("friends.blockHint")} onClick={() => act(p.id, "block")}>{t("friends.block")}</button>
                    </div></div>
                  )}
                </For>
              </section>
            </Show>

            <Show when={races() && races()!.length > 0}>
              <section class="d-flex flex-column gap-2">
                <h2 class="h5 mb-0">{t("friends.races")}</h2>
                <For each={races()}>{(r) => <Race race={r} onAction={raceAct} />}</For>
              </section>
            </Show>

            <section class="d-flex flex-column gap-2">
              <h2 class="h5 mb-0">{t("friends.yours")}</h2>
              <For each={f().friends} fallback={<p class="text-body-secondary mb-0">{t("friends.none")}</p>}>
                {(p) => <FriendRow person={p} racing={(races() ?? []).some((r) => ["pending", "active"].includes(r.status) && [r.challenger.id, r.opponent.id].includes(p.id))} onRaced={refresh} />}
              </For>
              <Show when={f().outgoing.length > 0}>
                <p class="qa-outgoing small text-body-secondary mb-0">{t("friends.waitingFor", { names: f().outgoing.map(displayName).join(", ") })}</p>
              </Show>
            </section>

            <Show when={f().blocked.length > 0}>
              <section class="d-flex flex-column gap-2">
                <h2 class="h6 mb-0 text-body-secondary">{t("friends.blocked")}</h2>
                <For each={f().blocked}>
                  {(p) => (
                    <div class="qa-blocked d-flex align-items-center gap-2">
                      <PersonLabel person={p} />
                      <button type="button" class="qa-unblock btn btn-sm btn-outline-secondary" onClick={() => act(p.id, "unblock")}>{t("friends.unblock")}</button>
                    </div>
                  )}
                </For>
              </section>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}

function PersonLabel(props: { person: Person }) {
  return (
    <A href={`/people/${props.person.id}`} class="qa-person-link me-auto fw-semibold text-decoration-none">{displayName(props.person)}</A>
  );
}

function FriendRow(props: { person: Person; racing: boolean; onRaced: () => unknown }) {
  const [open, setOpen] = createSignal(false);
  const [kind, setKind] = createSignal<ChallengeBody["kind"]>("most");
  const [days, setDays] = createSignal<(typeof RACE_DAYS)[number]>(7);
  const [target, setTarget] = createSignal(20);
  const [error, setError] = createSignal<string | null>(null);

  async function send(e: SubmitEvent) {
    e.preventDefault();
    const body: ChallengeBody = kind() === "most"
      ? { opponentId: props.person.id, kind: "most", days: days() }
      : { opponentId: props.person.id, kind: "first_to", target: target() };
    try {
      await api.post("/api/challenges", body);
      setOpen(false);
      await props.onRaced();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div class="qa-friend card"><div class="card-body d-flex flex-column gap-2">
      <div class="d-flex align-items-center gap-2">
        <A href={`/people/${props.person.id}`} class="qa-friend-link me-auto text-decoration-none">
          <div class="fw-semibold">{displayName(props.person)}</div>
        </A>
        <Show when={!props.racing}>
          <button type="button" class="qa-race-open btn btn-sm btn-outline-primary" onClick={() => setOpen(!open())}>{t("race.open")}</button>
        </Show>
      </div>
      <Show when={open()}>
        <form class="qa-race-form d-flex flex-wrap align-items-center gap-2" onSubmit={send}>
          <select class="qa-race-kind form-select form-select-sm w-auto" value={kind()} onChange={(e) => setKind(e.currentTarget.value as ChallengeBody["kind"])}>
            <option value="most">{t("race.kindMost")}</option>
            <option value="first_to">{t("race.kindFirstTo")}</option>
          </select>
          <Show when={kind() === "most"} fallback={
            <>
              <input type="number" class="qa-race-target form-control form-control-sm" style={{ width: "5rem" }} min={RACE_MIN_TARGET} max={200}
                value={target()} onInput={(e) => setTarget(e.currentTarget.valueAsNumber)} />
              <span class="small">{t("race.targetSuffix", { days: dayCount(RACE_DEADLINE_DAYS) })}</span>
            </>
          }>
            <select class="qa-race-days form-select form-select-sm w-auto" value={days()} onChange={(e) => setDays(Number(e.currentTarget.value) as (typeof RACE_DAYS)[number])}>
              <For each={RACE_DAYS}>{(d) => <option value={d}>{dayCount(d)}</option>}</For>
            </select>
          </Show>
          <button type="submit" class="qa-race-send btn btn-sm btn-primary">{t("race.send")}</button>
          <Show when={error()}><span class="text-danger small">{error()}</span></Show>
        </form>
      </Show>
    </div></div>
  );
}

/** One race the viewer is in: an invite to answer, one of theirs awaiting an answer, a race under way, or a result. */
function Race(props: { race: ChallengeOut; onAction: (id: number, action: string) => unknown }) {
  const r = () => props.race;
  const isMine = () => r().mine;
  const canAccept = () => r().status === "pending" && !isMine();
  return (
    <div class="qa-race card" classList={{ "border-primary": r().status === "active" }}><div class="card-body d-flex flex-wrap align-items-center gap-2">
      <div class="me-auto">
        <div class="fw-semibold">{t("race.title", { a: displayName(r().challenger), b: displayName(r().opponent), race: raceLabel(r()) })}</div>
        <div class="qa-race-status small text-body-secondary">
          <Switch>
            <Match when={r().status === "pending"}>{isMine() ? t("race.waitingForThem", { name: displayName(r().opponent) }) : t("race.waitingForYou")}</Match>
            <Match when={r().status === "active"}>
              {t("race.score", { a: r().scores.challenger, b: r().scores.opponent })} · {t("race.left", { days: dayCount(daysLeft(r().endsAt!)) })}
            </Match>
            <Match when={r().status === "finished"}>
              {t("race.score", { a: r().scores.challenger, b: r().scores.opponent })} ·{" "}
              {r().winnerId === null ? t("race.draw") : t("race.won", { name: displayName(r().winnerId === r().challenger.id ? r().challenger : r().opponent) })}
            </Match>
            <Match when={r().status === "declined"}>{t("race.declined")}</Match>
            <Match when={r().status === "cancelled"}>{t("race.cancelled")}</Match>
          </Switch>
        </div>
      </div>
      <Show when={canAccept()}>
        <button type="button" class="qa-race-accept btn btn-sm btn-success" onClick={() => props.onAction(r().id, "accept")}>{t("friends.accept")}</button>
        <button type="button" class="qa-race-decline btn btn-sm btn-outline-secondary" onClick={() => props.onAction(r().id, "decline")}>{t("friends.decline")}</button>
      </Show>
      <Show when={r().status === "pending" && isMine()}>
        <button type="button" class="qa-race-cancel btn btn-sm btn-outline-secondary" onClick={() => props.onAction(r().id, "cancel")}>{t("race.cancel")}</button>
      </Show>
    </div></div>
  );
}
