import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

test("switching the interface language localizes the UI and the meaning check, and survives a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await signIn(page, "locale1@example.com");

  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await page.locator(".qa-settings-locale").selectOption("es-419");
  await expect(page.locator(".qa-settings-general .qa-settings-status")).toHaveText("Guardado");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
  await expect(page.locator(".qa-settings-title")).toHaveText("Ajustes");
  await page.goto("/it");
  await page.locator(".qa-home-settings").click();
  await expect(page.locator(".qa-course-settings-title")).toHaveText("Ajustes de práctica de Italiano");
  await page.locator(".qa-settings-path").selectOption("sentences");
  await expect(page.locator(".qa-settings-status")).toHaveText("Guardado");
  await page.locator(".qa-settings-hints").selectOption("none");
  await expect(page.locator(".qa-settings-status")).toHaveText("Guardado");

  await page.goto("/it/lesson/it-a1-bar-1");
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

test("a language picked before sign-in becomes a new account's interface language", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-login-locale").selectOption("nl");
  await expect(page.locator(".qa-dev-submit")).toHaveText("Dev-login");
  await page.locator(".qa-dev-email").fill("locale2@example.com");
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-choose-username h1")).toHaveText("Kies een gebruikersnaam");
  await page.locator(".qa-username").fill("locale2");
  await page.locator(".qa-username-save").click();
  await expect(page.locator(".qa-user")).toHaveText("locale2");
  await expect(page.locator(".qa-nav-type")).toHaveText("Typen");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await expect(page.locator(".qa-settings-locale")).toHaveValue("nl");
});

test("a new account picks its interface language alongside its username", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-login-locale").selectOption("en");
  await page.locator(".qa-dev-email").fill("locale3@example.com");
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-choose-locale")).toHaveValue("en");
  await page.locator(".qa-choose-locale").selectOption("it");
  await expect(page.locator(".qa-choose-username h1")).toHaveText("Scegli un nome utente");
  await page.locator(".qa-username").fill("locale3");
  await page.locator(".qa-username-save").click();
  await expect(page.locator(".qa-user")).toHaveText("locale3");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await expect(page.locator(".qa-settings-locale")).toHaveValue("it");
});
