import assert from "node:assert/strict";
import test from "node:test";
import { InMemorySyncMonitor } from "./in-memory-sync-monitor.js";

test("InMemorySyncMonitor stores runtime state changes", () => {
    const monitor = new InMemorySyncMonitor();
    const nextRunAt = new Date("2026-03-11T12:00:00.000Z");

    monitor.setConfiguration({
        appPort: 3000,
        spreadsheetTargets: 2,
    });
    monitor.markTaskStarted("wbSync", { businessDate: "2026-03-11" });
    monitor.markTaskFinished("wbSync", "success", { warehouses: 10 });
    monitor.setNextRunAt(nextRunAt);

    const state = monitor.getState();

    assert.equal(state.configuration.appPort, 3000);
    assert.equal(state.configuration.spreadsheetTargets, 2);
    assert.equal(state.wbSync.status, "success");
    assert.deepEqual(state.wbSync.details, { warehouses: 10 });
    assert.equal(state.nextRunAt, "2026-03-11T12:00:00.000Z");
});

test("InMemorySyncMonitor returns a clone instead of mutable internal state", () => {
    const monitor = new InMemorySyncMonitor();
    const state = monitor.getState();

    state.configuration.appPort = 9999;

    assert.equal(monitor.getState().configuration.appPort, null);
});
