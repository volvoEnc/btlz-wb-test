import assert from "node:assert/strict";
import test from "node:test";
import { formatDateInTimeZone, getNextHourBoundary, isSupportedTimeZone } from "./date.js";

test("isSupportedTimeZone accepts valid IANA timezone and rejects GMT offset strings", () => {
    assert.equal(isSupportedTimeZone("Asia/Yekaterinburg"), true);
    assert.equal(isSupportedTimeZone("GMT+0300"), false);
});

test("formatDateInTimeZone formats date in requested timezone", () => {
    const formatted = formatDateInTimeZone(new Date("2026-03-11T23:30:00.000Z"), "Asia/Yekaterinburg");

    assert.equal(formatted, "2026-03-12");
});

test("formatDateInTimeZone throws on unsupported timezone", () => {
    assert.throws(() => formatDateInTimeZone(new Date("2026-03-11T23:30:00.000Z"), "GMT+0300"), /Unsupported time zone/);
});

test("getNextHourBoundary rounds date up to the next hour", () => {
    const nextBoundary = getNextHourBoundary(new Date("2026-03-11T10:15:20.000Z"));

    assert.equal(nextBoundary.toISOString(), "2026-03-11T11:00:00.000Z");
});
