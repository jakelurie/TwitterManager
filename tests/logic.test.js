import { test } from "node:test";
import assert from "node:assert/strict";
import { nextSlot, validCaption } from "../server/logic.js";
const settings = {
  timezone: "America/Los_Angeles",
  dailyLimit: 2,
  startHour: 9,
  endHour: 20,
};
test("caption validation uses X weighted limits, including emoji and links", () => {
  assert.equal(validCaption(""), false);
  assert.equal(validCaption("x".repeat(281)), false);
  assert.equal(validCaption("A beautiful day 🌿"), true);
  assert.equal(validCaption("https://example.com/" + "a".repeat(500)), true);
  assert.equal(validCaption("🌿".repeat(141)), false);
});
test("slots honor timezone, daily limits and three-hour spacing across DST", () => {
  const posts = [];
  const now = Date.parse("2026-11-01T07:30:00Z");
  for (let i = 0; i < 12; i++) {
    const scheduledAt = nextSlot(settings, posts, now);
    posts.push({ scheduledAt, status: "draft" });
  }
  const groups = {};
  for (const p of posts) {
    const d = new Date(p.scheduledAt);
    const hour = Number(
      new Intl.DateTimeFormat("en", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone: settings.timezone,
      }).format(d),
    );
    assert.ok(hour >= 9 && hour < 20);
    const day = d.toLocaleDateString("en-US", { timeZone: settings.timezone });
    groups[day] = (groups[day] || 0) + 1;
  }
  assert.ok(Object.values(groups).every((n) => n <= 2));
  for (let i = 1; i < posts.length; i++)
    assert.ok(
      new Date(posts[i].scheduledAt) - new Date(posts[i - 1].scheduledAt) >=
        3 * 3600000,
    );
});
