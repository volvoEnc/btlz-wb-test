import assert from "node:assert/strict";
import test from "node:test";
import type { SyncMonitor } from "#application/ports/sync-monitor.js";
import { HourlySyncScheduler } from "./hourly-sync-scheduler.js";
import type { RunTariffSyncCycleCommand } from "#application/use-cases/run-tariff-sync-cycle.use-case.js";
import { RunTariffSyncCycleUseCase } from "#application/use-cases/run-tariff-sync-cycle.use-case.js";

function createMonitorSpy(): SyncMonitor & { nextRunAtValues: Array<Date | null> } {
    return {
        markTaskFinished() {},
        markTaskStarted() {},
        nextRunAtValues: [],
        setConfiguration() {},
        setNextRunAt(value) {
            this.nextRunAtValues.push(value);
        },
    };
}

test("HourlySyncScheduler runNow executes sync cycle immediately", async () => {
    const commands: Array<{ businessDate: string; trigger: string }> = [];
    const runTariffSyncCycleUseCase = {
        async execute(command: RunTariffSyncCycleCommand) {
            commands.push(command);
        },
    } as unknown as RunTariffSyncCycleUseCase;
    const scheduler = new HourlySyncScheduler({
        fetchIntervalMinutes: 60,
        monitor: createMonitorSpy(),
        runTariffSyncCycleUseCase,
        timeZone: "UTC",
    });

    await scheduler.runNow("startup");

    assert.equal(commands.length, 1);
    assert.equal(commands[0].trigger, "startup");
    assert.match(commands[0].businessDate, /^\d{4}-\d{2}-\d{2}$/);
});

test("HourlySyncScheduler start schedules timeout and interval, stop clears timers", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    const originalSetInterval = globalThis.setInterval;
    const originalClearTimeout = globalThis.clearTimeout;
    const originalClearInterval = globalThis.clearInterval;

    const monitor = createMonitorSpy();
    const commands: Array<{ businessDate: string; trigger: string }> = [];

    let timeoutCallback: (() => void | Promise<void>) | null = null;
    let timeoutHandle: { delay: number; type: string } | null = null;
    let intervalHandle: { callback: () => void | Promise<void>; delay: number; type: string } | null = null;
    let intervalDelay: number | null = null;
    let clearedTimeout: unknown = null;
    let clearedInterval: unknown = null;

    globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
        timeoutCallback = callback as () => void | Promise<void>;
        timeoutHandle = { delay: delay ?? 0, type: "timeout" };
        return timeoutHandle as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout;

    globalThis.setInterval = ((callback: TimerHandler, delay?: number) => {
        intervalHandle = {
            callback: callback as () => void | Promise<void>,
            delay: delay ?? 0,
            type: "interval",
        };
        intervalDelay = delay ?? 0;
        return intervalHandle as unknown as NodeJS.Timeout;
    }) as unknown as typeof setInterval;

    globalThis.clearTimeout = ((handle?: NodeJS.Timeout) => {
        clearedTimeout = handle ?? null;
    }) as typeof clearTimeout;

    globalThis.clearInterval = ((handle?: NodeJS.Timeout) => {
        clearedInterval = handle ?? null;
    }) as typeof clearInterval;

    try {
        const runTariffSyncCycleUseCase = {
            async execute(command: RunTariffSyncCycleCommand) {
                commands.push(command);
            },
        } as unknown as RunTariffSyncCycleUseCase;
        const scheduler = new HourlySyncScheduler({
            fetchIntervalMinutes: 15,
            monitor,
            runTariffSyncCycleUseCase,
            timeZone: "UTC",
        });

        scheduler.start();

        assert.equal(monitor.nextRunAtValues.length, 1);
        assert.notEqual(timeoutCallback, null);
        if (!timeoutCallback) {
            throw new Error("Timeout callback was not scheduled");
        }
        const scheduledTimeoutCallback = timeoutCallback as () => void | Promise<void>;

        await scheduledTimeoutCallback();

        assert.equal(commands.length, 1);
        assert.equal(commands[0].trigger, "hourly");
        assert.equal(intervalDelay, 15 * 60_000);

        await scheduler.stop();

        assert.equal(clearedTimeout, timeoutHandle);
        assert.equal(clearedInterval, intervalHandle);
        assert.equal(monitor.nextRunAtValues.at(-1), null);
    } finally {
        globalThis.setTimeout = originalSetTimeout;
        globalThis.setInterval = originalSetInterval;
        globalThis.clearTimeout = originalClearTimeout;
        globalThis.clearInterval = originalClearInterval;
    }
});
