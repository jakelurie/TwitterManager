import { test, expect } from "@playwright/test";
import sharp from "sharp";
test("desktop: upload, persist context and settings, draft, edit, cancel, delete", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good things take a little perch." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Control center", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your goal", exact: true })
    .fill("Grow a thoughtful community around landscape photography.");
  await page
    .getByRole("button", { name: "Save direction", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.getByRole("switch", { name: "Live posting", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Connect an X account");
  const png = await sharp({
    create: { width: 640, height: 400, channels: 3, background: "#bdc9dd" },
  })
    .png()
    .toBuffer();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "test-landscape.png",
      mimeType: "image/png",
      buffer: png,
    });
  await expect(
    page.getByText("test-landscape.png", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add context", exact: true }).click();
  await page
    .getByLabel("The story behind this moment")
    .fill("A quiet morning on the coast.");
  await page.getByRole("button", { name: "Save context" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Media bucket", exact: true }).click();
  await expect(
    page.getByText("test-landscape.png", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create draft with test-landscape.png" })
    .click();
  await page.getByRole("button", { name: "Review post", exact: true }).click();
  await page
    .getByLabel("Caption", { exact: true })
    .fill("A quiet morning on the coast. Where do you go to slow down?");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText(
      "A quiet morning on the coast. Where do you go to slow down?",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review post", exact: true }).click();
  await page.getByRole("button", { name: "Approve post", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Connect X");
  await page.getByRole("button", { name: "Cancel post", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your calendar has a fresh start." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Media bucket", exact: true }).click();
  await page.getByRole("button", { name: "Add context", exact: true }).click();
  await page.getByRole("button", { name: "Delete media", exact: true }).click();
  await page.getByRole("button", { name: "Delete file", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A bucket full of possibilities" }),
  ).toBeVisible();
  const data = await (await request.get("/api/state")).json();
  expect(data.secrets).toBeUndefined();
  expect(data.settings.autopilot).toBe(false);
  expect(data.history.length).toBeGreaterThan(4);
  expect(errors).toEqual([]);
});
test("mobile: navigation, controls and layout fit a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good things take a little perch." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "data/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Control center", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your goal", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page
    .getByRole("button", { name: "Connect", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
});
test("API rejects invalid settings, cross-origin mutations and fake media", async ({
  request,
}) => {
  expect(
    (
      await request.patch("/api/settings", { data: { dailyLimit: 999 } })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.patch("/api/settings", {
        data: { timezone: "Nowhere/Missing" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.patch("/api/settings", {
        headers: { Origin: "https://untrusted.example" },
        data: { goal: "bad" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/media", {
        multipart: {
          files: {
            name: "fake.png",
            mimeType: "image/png",
            buffer: Buffer.from("<script>test</script>"),
          },
        },
      })
    ).status(),
  ).toBe(400);
  expect((await request.post("/api/plan", { data: {} })).status()).toBe(400);
});
