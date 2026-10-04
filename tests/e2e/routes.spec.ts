import { ROUTE_MARKERS, ROUTE_SAMPLES } from "../route-samples.ts";
import { test } from "./fixtures.ts";
import { createSampleIds, expectPageOpens, signIn } from "./helpers.ts";

test("every route helper's sample URL opens a page with its content, not 'Page not found' or a spinner", async ({ page }) => {
  await signIn(page, "operator2@example.com");
  const ids = await createSampleIds(page);
  for (const [name, sample] of Object.entries(ROUTE_SAMPLES)) {
    await test.step(name, () => expectPageOpens(page, sample(ids), ROUTE_MARKERS[name as keyof typeof ROUTE_MARKERS]));
  }
});
