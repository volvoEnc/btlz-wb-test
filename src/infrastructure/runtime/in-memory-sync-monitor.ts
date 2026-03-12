import type { SyncMonitor, SyncRuntimeState, SyncTaskName, SyncTaskState, SyncTaskStatus } from "#application/ports/sync-monitor.js";

/**
 * Пустое состояние задачи.
 */
const createTaskState = (): SyncTaskState => ({
    completedAt: null,
    details: {},
    error: null,
    startedAt: null,
    status: "idle",
});

/**
 * Монитор в памяти.
 */
export class InMemorySyncMonitor implements SyncMonitor {
    private readonly state: SyncRuntimeState = {
        configuration: {
            appPort: null,
            googleSheetName: null,
            spreadsheetTargets: 0,
            timeZone: null,
            wbApiUrl: null,
        },
        googleSheetsSync: createTaskState(),
        nextRunAt: null,
        startedAt: new Date().toISOString(),
        wbSync: createTaskState(),
    };

    /**
     * Возвращает копию состояния.
     */
    public getState(): SyncRuntimeState {
        return structuredClone(this.state);
    }

    /**
     * @inheritdoc
     */
    public markTaskFinished(
        taskName: SyncTaskName,
        status: Exclude<SyncTaskStatus, "idle" | "running">,
        details: Record<string, unknown> = {},
    ): void {
        this.state[taskName] = {
            completedAt: new Date().toISOString(),
            details,
            error: status === "error" ? String(details.error ?? "Unknown error") : null,
            startedAt: this.state[taskName].startedAt,
            status,
        };
    }

    /**
     * @inheritdoc
     */
    public markTaskStarted(taskName: SyncTaskName, details: Record<string, unknown> = {}): void {
        this.state[taskName] = {
            completedAt: null,
            details,
            error: null,
            startedAt: new Date().toISOString(),
            status: "running",
        };
    }

    /**
     * @inheritdoc
     */
    public setConfiguration(configuration: Partial<SyncRuntimeState["configuration"]>): void {
        this.state.configuration = {
            ...this.state.configuration,
            ...configuration,
        };
    }

    /**
     * @inheritdoc
     */
    public setNextRunAt(nextRunAt: Date | null): void {
        this.state.nextRunAt = nextRunAt ? nextRunAt.toISOString() : null;
    }
}
