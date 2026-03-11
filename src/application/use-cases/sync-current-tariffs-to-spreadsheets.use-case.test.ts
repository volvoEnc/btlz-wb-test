import assert from "node:assert/strict";
import test from "node:test";
import type { SyncMonitor } from "../ports/sync-monitor.js";
import { SyncCurrentTariffsToSpreadsheetsUseCase } from "./sync-current-tariffs-to-spreadsheets.use-case.js";
import { createSpreadsheetTargetsFixture, createTariffSpreadsheetViewFixture } from "../../testing/fixtures.js";

interface MonitorCall {
    args: unknown[];
    method: string;
}

function createMonitorSpy(): SyncMonitor & { calls: MonitorCall[] } {
    const calls: MonitorCall[] = [];

    return {
        calls,
        markTaskFinished(...args) {
            calls.push({ args, method: "markTaskFinished" });
        },
        markTaskStarted(...args) {
            calls.push({ args, method: "markTaskStarted" });
        },
        setConfiguration() {},
        setNextRunAt() {},
    };
}

test("SyncCurrentTariffsToSpreadsheetsUseCase skips when no spreadsheet targets exist", async () => {
    const monitor = createMonitorSpy();
    let repositoryReadCalled = false;

    const useCase = new SyncCurrentTariffsToSpreadsheetsUseCase({
        monitor,
        sortByCoefficient: "box_delivery_coef_expr",
        spreadsheetPublisher: {
            isConfigured() {
                return true;
            },
            async publishTariffs() {
                throw new Error("must not be called");
            },
        },
        spreadsheetTargetRepository: {
            async getEnabledTargets() {
                return [];
            },
            async saveSyncResult() {
                throw new Error("must not be called");
            },
            async syncConfiguredTargets() {
                throw new Error("must not be called");
            },
        },
        tariffRepository: {
            async getLatestSpreadsheetView() {
                repositoryReadCalled = true;
                return null;
            },
            async saveDailySnapshot() {
                throw new Error("must not be called");
            },
        },
    });

    await useCase.execute({ preferredDate: "2026-03-11" });

    assert.equal(repositoryReadCalled, false);
    assert.deepEqual(monitor.calls[1], {
        args: [
            "googleSheetsSync",
            "skipped",
            {
                message: "No spreadsheet IDs configured",
                spreadsheets: 0,
            },
        ],
        method: "markTaskFinished",
    });
});

test("SyncCurrentTariffsToSpreadsheetsUseCase marks targets as skipped when publisher is not configured", async () => {
    const monitor = createMonitorSpy();
    const targets = createSpreadsheetTargetsFixture();
    const syncResults: unknown[][] = [];

    const useCase = new SyncCurrentTariffsToSpreadsheetsUseCase({
        monitor,
        sortByCoefficient: "box_delivery_coef_expr",
        spreadsheetPublisher: {
            isConfigured() {
                return false;
            },
            async publishTariffs() {
                throw new Error("must not be called");
            },
        },
        spreadsheetTargetRepository: {
            async getEnabledTargets() {
                return targets;
            },
            async saveSyncResult(...args) {
                syncResults.push(args);
            },
            async syncConfiguredTargets() {
                throw new Error("must not be called");
            },
        },
        tariffRepository: {
            async getLatestSpreadsheetView() {
                throw new Error("must not be called");
            },
            async saveDailySnapshot() {
                throw new Error("must not be called");
            },
        },
    });

    await useCase.execute({ preferredDate: "2026-03-11" });

    assert.deepEqual(syncResults, [
        ["spreadsheet-1", "skipped", "Google credentials are not configured"],
        ["spreadsheet-2", "skipped", "Google credentials are not configured"],
    ]);
    assert.deepEqual(monitor.calls[1], {
        args: [
            "googleSheetsSync",
            "skipped",
            {
                message: "Google credentials are not configured",
                spreadsheets: 2,
            },
        ],
        method: "markTaskFinished",
    });
});

test("SyncCurrentTariffsToSpreadsheetsUseCase publishes to all targets when data exists", async () => {
    const monitor = createMonitorSpy();
    const targets = createSpreadsheetTargetsFixture();
    const view = createTariffSpreadsheetViewFixture();
    const published: unknown[][] = [];
    const syncResults: unknown[][] = [];

    const useCase = new SyncCurrentTariffsToSpreadsheetsUseCase({
        monitor,
        sortByCoefficient: "box_delivery_coef_expr",
        spreadsheetPublisher: {
            isConfigured() {
                return true;
            },
            async publishTariffs(target, spreadsheetView) {
                published.push([target, spreadsheetView]);
            },
        },
        spreadsheetTargetRepository: {
            async getEnabledTargets() {
                return targets;
            },
            async saveSyncResult(...args) {
                syncResults.push(args);
            },
            async syncConfiguredTargets() {
                throw new Error("must not be called");
            },
        },
        tariffRepository: {
            async getLatestSpreadsheetView() {
                return view;
            },
            async saveDailySnapshot() {
                throw new Error("must not be called");
            },
        },
    });

    await useCase.execute({ preferredDate: "2026-03-11" });

    assert.equal(published.length, 2);
    assert.equal(syncResults.length, 2);
    assert.deepEqual(monitor.calls[1], {
        args: [
            "googleSheetsSync",
            "success",
            {
                rows: 1,
                sourceDate: "2026-03-11",
                spreadsheets: 2,
                syncedCount: 2,
            },
        ],
        method: "markTaskFinished",
    });
});

test("SyncCurrentTariffsToSpreadsheetsUseCase returns error status on partial publish failure", async () => {
    const monitor = createMonitorSpy();
    const targets = createSpreadsheetTargetsFixture();
    const view = createTariffSpreadsheetViewFixture();
    const syncResults: unknown[][] = [];

    const useCase = new SyncCurrentTariffsToSpreadsheetsUseCase({
        monitor,
        sortByCoefficient: "box_delivery_coef_expr",
        spreadsheetPublisher: {
            isConfigured() {
                return true;
            },
            async publishTariffs(target) {
                if (target.spreadsheetId === "spreadsheet-2") {
                    throw new Error("publish failed");
                }
            },
        },
        spreadsheetTargetRepository: {
            async getEnabledTargets() {
                return targets;
            },
            async saveSyncResult(...args) {
                syncResults.push(args);
            },
            async syncConfiguredTargets() {
                throw new Error("must not be called");
            },
        },
        tariffRepository: {
            async getLatestSpreadsheetView() {
                return view;
            },
            async saveDailySnapshot() {
                throw new Error("must not be called");
            },
        },
    });

    await useCase.execute({ preferredDate: "2026-03-11" });

    assert.deepEqual(syncResults, [
        ["spreadsheet-1", "success"],
        ["spreadsheet-2", "error", "publish failed"],
    ]);
    assert.deepEqual(monitor.calls[1], {
        args: [
            "googleSheetsSync",
            "error",
            {
                rows: 1,
                sourceDate: "2026-03-11",
                spreadsheets: 2,
                syncedCount: 1,
            },
        ],
        method: "markTaskFinished",
    });
});
