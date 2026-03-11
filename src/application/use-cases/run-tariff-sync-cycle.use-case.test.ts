import assert from "node:assert/strict";
import test from "node:test";
import { RunTariffSyncCycleUseCase } from "./run-tariff-sync-cycle.use-case.js";
import type { SyncCurrentTariffsToSpreadsheetsCommand, SyncCurrentTariffsToSpreadsheetsUseCase } from "./sync-current-tariffs-to-spreadsheets.use-case.js";
import type { SyncDailyWbTariffsCommand, SyncDailyWbTariffsUseCase } from "./sync-daily-wb-tariffs.use-case.js";

test("RunTariffSyncCycleUseCase orchestrates target sync, WB sync and spreadsheet sync in order", async () => {
    const calls: unknown[][] = [];
    const syncCurrentTariffsToSpreadsheetsUseCase = {
        async execute(command: SyncCurrentTariffsToSpreadsheetsCommand) {
            calls.push(["syncCurrentTariffs", command]);
        },
    } as unknown as SyncCurrentTariffsToSpreadsheetsUseCase;
    const syncDailyWbTariffsUseCase = {
        async execute(command: SyncDailyWbTariffsCommand) {
            calls.push(["syncDailyWbTariffs", command]);
        },
    } as unknown as SyncDailyWbTariffsUseCase;

    const useCase = new RunTariffSyncCycleUseCase({
        configuredSpreadsheetIds: ["sheet-a", "sheet-b"],
        defaultSheetName: "stocks_coefs",
        spreadsheetTargetRepository: {
            async getEnabledTargets() {
                return [];
            },
            async saveSyncResult() {},
            async syncConfiguredTargets(spreadsheetIds, sheetName) {
                calls.push(["syncConfiguredTargets", spreadsheetIds, sheetName]);
            },
        },
        syncCurrentTariffsToSpreadsheetsUseCase,
        syncDailyWbTariffsUseCase,
    });

    await useCase.execute({
        businessDate: "2026-03-11",
        trigger: "startup",
    });

    assert.deepEqual(calls, [
        ["syncConfiguredTargets", ["sheet-a", "sheet-b"], "stocks_coefs"],
        ["syncDailyWbTariffs", { businessDate: "2026-03-11", trigger: "startup" }],
        ["syncCurrentTariffs", { preferredDate: "2026-03-11" }],
    ]);
});
