import { Navigate } from "@solidjs/router";

/**
 * LEGACY: sends an old unscoped typing URL (`/:lang/lesson/...`, `/:lang/test/...`, `/:lang/review`, `/:lang/notebook`,
 * `/:lang/mistakes/practice`) to its place under `/:lang/type/`, for learners with the old link open or bookmarked.
 * Delete this file and its routes in main.tsx by 2026-10-02 (see TODO.md).
 */
export function LegacyTypeRedirect() {
  return (
    <Navigate href={({ location }) =>
      location.pathname
        .replace(/^\/([^/]+)\/mistakes\/practice$/, "/$1/type/review")
        .replace(/^\/([^/]+)\/(lesson|test|review|notebook)(?=\/|$)/, "/$1/type/$2") + location.search + location.hash} />
  );
}
