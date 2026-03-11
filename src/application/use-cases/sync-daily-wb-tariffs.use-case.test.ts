import assert from "node:assert/strict";
import test from "node:test";
import type { SyncMonitor } from "../ports/sync-monitor.js";
import type { TariffRepository } from "../ports/tariff-repository.js";
import { SyncDailyWbTariffsUseCase } from "./sync-daily-wb-tariffs.use-case.js";
import { createDailyTariffSnapshotFixture } from "../../testing/fixtures.js";

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

test("SyncDailyWbTariffsUseCase saves snapshot when source is configured", async () => {
    const monitor = createMonitorSpy();
    const snapshot = createDailyTariffSnapshotFixture();
    let savedSnapshot: typeof snapshot | null = null;
    const tariffRepository: TariffRepository = {
        async getLatestSpreadsheetView() {
            return null;
        },
        async saveDailySnapshot(value) {
            savedSnapshot = value;
        },
    };

    const useCase = new SyncDailyWbTariffsUseCase({
        monitor,
        tariffRepository,
        tariffSource: {
            async fetchDailyTariffs() {
                return snapshot;
            },
            isConfigured() {
                return true;
            },
        },
    });

    await useCase.execute({
        businessDate: "2026-03-11",
        trigger: "startup",
    });

    assert.deepEqual(savedSnapshot, snapshot);
    assert.equal(monitor.calls[0].method, "markTaskStarted");
    assert.deepEqual(monitor.calls[1], {
        args: [
            "wbSync",
            "success",
            {
                businessDate: "2026-03-11",
                fetchedAt: snapshot.fetchedAt,
                warehouses: 1,
            },
        ],
        method: "markTaskFinished",
    });
});

test("SyncDailyWbTariffsUseCase skips sync when source is not configured", async () => {
    const monitor = createMonitorSpy();
    let repositoryCalled = false;
    const tariffRepository: TariffRepository = {
        async getLatestSpreadsheetView() {
            return null;
        },
        async saveDailySnapshot() {
            repositoryCalled = true;
        },
    };

    const useCase = new SyncDailyWbTariffsUseCase({
        monitor,
        tariffRepository,
        tariffSource: {
            async fetchDailyTariffs() {
                throw new Error("must not be called");
            },
            isConfigured() {
                return false;
            },
        },
    });

    await useCase.execute({
        businessDate: "2026-03-11",
        trigger: "hourly",
    });

    assert.equal(repositoryCalled, false);
    assert.deepEqual(monitor.calls[1], {
        args: [
            "wbSync",
            "skipped",
            {
                businessDate: "2026-03-11",
                message: "WB_API_TOKEN is not configured",
            },
        ],
        method: "markTaskFinished",
    });
});

test("SyncDailyWbTariffsUseCase captures source errors in monitor", async () => {
    const monitor = createMonitorSpy();
    const tariffRepository: TariffRepository = {
        async getLatestSpreadsheetView() {
            return null;
        },
        async saveDailySnapshot() {
            throw new Error("must not be called");
        },
    };

    const useCase = new SyncDailyWbTariffsUseCase({
        monitor,
        tariffRepository,
        tariffSource: {
            async fetchDailyTariffs() {
                throw new Error("wb failed");
            },
            isConfigured() {
                return true;
            },
        },
    });

    await useCase.execute({
        businessDate: "2026-03-11",
        trigger: "hourly",
    });

    assert.deepEqual(monitor.calls[1], {
        args: [
            "wbSync",
            "error",
            {
                businessDate: "2026-03-11",
                error: "wb failed",
            },
        ],
        method: "markTaskFinished",
    });
});
