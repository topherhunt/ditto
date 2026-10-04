import { A } from "@solidjs/router";
import type { JSX } from "solid-js";
import { routes } from "../routes.ts";

// Admin-only, so English-only: the label is not in the i18n dictionaries.

/** "Admin > page" breadcrumb for the operator pages; the Admin link goes back to the index at `/admin`. */
export function AdminCrumb(props: { children: JSX.Element }) {
  return (
    <span class="qa-admin-crumb">
      <A href={routes.admin()} class="qa-admin-crumb-home text-body-secondary text-decoration-none">Admin</A>
      <i class="bi bi-chevron-right mx-2 small text-body-secondary" aria-hidden="true" />
      {props.children}
    </span>
  );
}
