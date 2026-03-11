import assert from "node:assert/strict";
import test from "node:test";
import { formatDateInTimeZone, getNextHourBoundary } from "./date.js";

test("formatDateInTimeZone formats date in requested timezone", () => {
    const formatted = formatDateInTimeZone(new Date("2026-03-11T23:30:00.000Z"), "Asia/Yekaterinburg");

    assert.equal(formatted, "2026-03-12");
});

test("getNextHourBoundary rounds date up to the next hour", () => {
    const nextBoundary = getNextHourBoundary(new Date("2026-03-11T10:15:20.000Z"));

    assert.equal(nextBoundary.toISOString(), "2026-03-11T11:00:00.000Z");
});
