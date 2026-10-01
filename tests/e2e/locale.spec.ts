import { expect, test } from "@playwright/test";
import { openPracticeSettings, setLearning, signIn } from "./helpers.ts";

test("switching your language localizes the UI and the meaning check, and survives a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await signIn(page, "locale1@example.com");

  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await page.locator(".qa-settings-locale").selectOption("es-419");
  await expect(page.locator(".qa-settings-general .qa-settings-status")).toHaveText("Guardado");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
  await expect(page.locator(".qa-settings-title")).toHaveText("Ajustes");
  await openPracticeSettings(page, "it");
  await expect(page.locator(".qa-prefs-toggle")).toContainText("Ajustes de práctica");
  await page.locator(".qa-settings-path").selectOption("sentences");
  await expect(page.locator(".qa-settings-status")).toHaveText("Guardado");
  await page.locator(".qa-settings-hints").selectOption("none");
  await expect(page.locator(".qa-settings-status")).toHaveText("Guardado");

  await page.goto("/it/type/lesson/it-a1-bar-1");
  await page.locator(".qa-free-input").fill("Vorrei un caffè, per favore.");
  await page.locator(".qa-free-input").press("Enter");
  await expect(page.locator(".qa-meaning-option")).toHaveCount(3);
  // Options are shuffled and each starts with its key number.
  const options = (await page.locator(".qa-meaning-option").allInnerTexts()).map((s) => s.replace(/^\d\s*/, "")).sort();
  expect(options).toEqual(["Quisiera la cuenta, por favor.", "Quisiera un café, por favor.", "Un café para mí, gracias."]);
  await page.locator(".qa-meaning-option").filter({ hasText: "Quisiera un café, por favor." }).click();
  await expect(page.locator(".qa-outcome")).toHaveText("Perfecto");

  // The choice is stored on the account, so it holds after a reload.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
  await expect(page.locator(".qa-check")).toHaveText("Comprobar");
});

test("interface immersion shows every page in the course's language, signed out too, while translations stay in yours", async ({ page }) => {
  await signIn(page, "immerse1@example.com");
  await openPracticeSettings(page, "it");
  await page.locator(".qa-settings-path").selectOption("sentences");
  await expect(page.locator(".qa-settings-status")).toHaveText("Saved");
  await page.locator(".qa-settings-hints").selectOption("none");
  await expect(page.locator(".qa-settings-status")).toHaveText("Saved");
  await page.goto("/settings");
  await expect(page.locator(".qa-settings-immerseUi-it")).toHaveAttribute("aria-label", "Show the app in Italian");
  await page.locator(".qa-settings-immerseUi-it").check();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.locator(".qa-settings-immerseUi-it")).toHaveAttribute("aria-label", "Mostra l'app in italiano");

  await page.goto("/it/type/lesson/it-a1-bar-1");
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.locator(".qa-nav-type")).toHaveText("Digita");
  await page.locator(".qa-free-input").fill("Vorrei un caffè, per favore.");
  await page.locator(".qa-free-input").press("Enter");
  await expect(page.locator(".qa-meaning-option")).toHaveCount(3);
  const options = (await page.locator(".qa-meaning-option").allInnerTexts()).map((s) => s.replace(/^\d\s*/, "")).sort();
  expect(options).toEqual(["A coffee for me, thanks.", "I'd like a coffee, please.", "I'd like the bill, please."]);

  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await expect(page.locator(".qa-settings-title")).toHaveText("Impostazioni");

  await page.locator(".qa-user").click();
  await page.locator(".qa-logout").click();
  await page.reload();
  await expect(page.locator(".qa-welcome")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.locator(".qa-welcome-speak-en")).toHaveAttribute("aria-pressed", "true");
  await page.locator(".qa-welcome-speak-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("Greek is not offered as your own language, since no course is translated into it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".qa-welcome-speak-nl")).toBeVisible();
  await expect(page.locator(".qa-welcome-speak-el")).toHaveCount(0);
  await signIn(page, "greek1@example.com");
  await page.goto("/settings");
  await expect(page.locator(".qa-settings-locale option")).toHaveCount(4);
  await expect(page.locator(".qa-settings-locale option[value=el]")).toHaveCount(0);
});

test("interface immersion in the Greek course shows the app in Greek", async ({ page }) => {
  await signIn(page, "greek2@example.com");
  await setLearning(page, ["it", "el"]);
  await page.goto("/settings");
  await expect(page.locator(".qa-settings-immerseUi-el")).toHaveAttribute("aria-label", "Show the app in Greek");
  await page.locator(".qa-settings-immerseUi-el").check();
  await expect(page.locator(".qa-settings-status")).toHaveText("Saved");
  await page.goto("/el/type");
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
});

test("a course the app isn't translated into offers no immersion", async ({ page }) => {
  await signIn(page, "immerse2@example.com");
  await setLearning(page, ["it", "ga"]);
  await page.goto("/settings");
  await expect(page.locator(".qa-settings-immerseUi-it")).toBeVisible();
  await expect(page.locator(".qa-settings-immerseUi-ga")).toHaveCount(0);
});

test("interface immersion in the Spanish course shows the app in its es-419 locale", async ({ page }) => {
  await signIn(page, "immerse3@example.com");
  await setLearning(page, ["it", "es"]);
  await page.goto("/settings");
  await page.locator(".qa-settings-immerseUi-es").check();
  await expect(page.locator(".qa-settings-status")).toHaveText("Saved");
  await page.goto("/es/type");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
});

test("a language picked before sign-in becomes a new account's language", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-welcome-speak-nl").click();
  await page.locator(".qa-learn-it").click();
  await expect(page.locator(".qa-dev-submit")).toHaveText("Dev-login");
  await page.locator(".qa-dev-email").fill("locale2@example.com");
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-choose-username h1")).toHaveText("Welkom bij Ditto! 👋");
  await page.locator(".qa-level-A1").click();
  await page.locator(".qa-username").fill("locale2");
  await page.locator(".qa-username-save").click();
  await expect(page.locator(".qa-user")).toHaveText("locale2");
  await expect(page.locator(".qa-nav-type")).toHaveText("Typen");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await expect(page.locator(".qa-settings-locale")).toHaveValue("nl");
});

test("a new account picks its language alongside its username", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-welcome-speak-en").click();
  await page.locator(".qa-learn-it").click();
  await page.locator(".qa-dev-email").fill("locale3@example.com");
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-choose-locale")).toHaveValue("en");
  await page.locator(".qa-choose-locale").selectOption("it");
  await expect(page.locator(".qa-choose-username h1")).toHaveText("Benvenuto su Ditto! 👋");
  // Italian lowercases language names mid-sentence.
  await expect(page.locator(".qa-level-picker legend")).toHaveText("Quanto italiano sai?");
  await page.locator(".qa-level-A1").click();
  await page.locator(".qa-username").fill("locale3");
  await page.locator(".qa-username-save").click();
  await expect(page.locator(".qa-user")).toHaveText("locale3");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await expect(page.locator(".qa-settings-locale")).toHaveValue("it");
});
