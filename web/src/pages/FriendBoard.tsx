import { A } from "@solidjs/router";
import { createResource, createSignal, For, Match, Show, Switch } from "solid-js";
import { BOARD_BLURB_MAX, FRIEND_REQUESTS_PER_DAY, type BoardEntry, type BoardOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { languageName, t } from "../i18n/index.ts";
import { LANGUAGE_FLAGS } from "../learning.ts";
import { activityText, displayName, sendFriendRequest } from "../social.ts";

export function MakeFriendsButton() {
  return (
    <A href="/friends/board" class="qa-make-friends btn btn-outline-primary align-self-start">
      <i class="bi bi-person-fill-add me-1" />{t("board.open")}
    </A>
  );
}

/** Learners who opted in to meet strangers. You see it once you've posted your own entry. */
export function FriendBoard() {
  const [board, { mutate }] = createResource(() => api.get<BoardOut>("/api/friend-board"));
  const [blurb, setBlurb] = createSignal("");
  const [limited, setLimited] = createSignal(false);

  async function post(e: SubmitEvent) {
    e.preventDefault();
    mutate(await api.put<BoardOut>("/api/friend-board", { blurb: blurb() }));
  }
  async function retract() {
    mutate(await api.del<BoardOut>("/api/friend-board"));
  }
  /** Updates the one entry in place, so the board keeps its order. */
  async function befriend(entry: BoardEntry) {
    const relation = await sendFriendRequest(entry.person.id);
    if (relation === null) return setLimited(true);
    const b = board()!;
    if (!b.posted) throw new Error("Befriended from a board that isn't shown");
    mutate({ ...b, entries: b.entries.map((x) => (x.person.id === entry.person.id ? { ...x, relation } : x)) });
  }

  return (
    <div class="d-flex flex-column gap-3">
      <h1 class="h3 mb-0">{t("board.title")}</h1>
      <p class="text-body-secondary mb-0">{t("board.intro")}</p>
      <Show when={board()}>
        {(b) => (
          <Show when={b().posted ? (b() as Extract<BoardOut, { posted: true }>) : null} fallback={
            <form class="qa-board-form card" onSubmit={post}><div class="card-body d-flex flex-column gap-2">
              <label class="form-label mb-0" for="board-blurb">{t("board.blurbLabel")}</label>
              <input id="board-blurb" type="text" class="qa-board-blurb form-control" maxLength={BOARD_BLURB_MAX} placeholder={t("board.blurbPlaceholder")}
                value={blurb()} onInput={(e) => setBlurb(e.currentTarget.value)} />
              <p class="small text-body-secondary mb-0">{t("board.shows")}</p>
              <button type="submit" class="qa-board-post btn btn-primary align-self-start">{t("board.post")}</button>
            </div></form>
          }>
            {(on) => (
              <>
                <Show when={limited()}><p class="qa-friend-limit alert alert-info mb-0">{t("friends.limit", { n: FRIEND_REQUESTS_PER_DAY })}</p></Show>
                <ul class="qa-board list-group">
                  <For each={on().entries}>{(entry) => <Entry entry={entry} onBefriend={befriend} />}</For>
                </ul>
                <Show when={on().entries.length === 1}><p class="text-body-secondary mb-0">{t("board.onlyYou")}</p></Show>
                <button type="button" class="qa-board-retract btn btn-sm btn-outline-secondary align-self-start" onClick={retract}>{t("board.retract")}</button>
              </>
            )}
          </Show>
        )}
      </Show>
    </div>
  );
}

function Entry(props: { entry: BoardEntry; onBefriend: (e: BoardEntry) => unknown }) {
  const e = () => props.entry;
  const facts = () => [
    e().language && `${LANGUAGE_FLAGS[e().language!]} ${languageName(e().language!)}`,
    e().level,
    activityText(e().activity),
  ].filter(Boolean).join(" · ");
  return (
    <li class="qa-board-entry list-group-item d-flex align-items-center gap-3" classList={{ "list-group-item-primary": e().isMe }}>
      <div class="me-auto">
        <A href={`/people/${e().person.id}`} class="qa-person-link fw-semibold text-decoration-none">{displayName(e().person)}</A>
        <div class="small text-body-secondary">{facts()}</div>
        <Show when={e().blurb}><div class="qa-board-entry-blurb">{e().blurb}</div></Show>
      </div>
      <Switch>
        <Match when={e().isMe}><span class="qa-board-you small text-body-secondary fst-italic">{t("board.you")}</span></Match>
        <Match when={e().relation === "none"}>
          <button type="button" class="qa-board-add btn btn-sm btn-success" onClick={() => props.onBefriend(e())}>{t("profile.addFriend")}</button>
        </Match>
        <Match when={e().relation === "incoming"}>
          <button type="button" class="qa-board-add btn btn-sm btn-success" onClick={() => props.onBefriend(e())}>{t("profile.acceptRequest")}</button>
        </Match>
        <Match when={e().relation === "outgoing"}><span class="qa-board-sent small text-body-secondary">{t("profile.requestSent")}</span></Match>
        <Match when={e().relation === "friends"}><span class="small text-body-secondary">{t("board.friends")}</span></Match>
      </Switch>
    </li>
  );
}
