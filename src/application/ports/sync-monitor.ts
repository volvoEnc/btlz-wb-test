/**
 * Имя фоновой задачи.
 */
export type SyncTaskName = "googleSheetsSync" | "wbSync";
/**
 * Статус задачи.
 */
export type SyncTaskStatus = "idle" | "running" | "success" | "error" | "skipped";

/**
 * Состояние задачи.
 */
export interface SyncTaskState {
    /** Когда закончилась. */
    completedAt: string | null;
    /** Детали. */
    details: Record<string, unknown>;
    /** Ошибка. */
    error: string | null;
    /** Когда стартовала. */
    startedAt: string | null;
    /** Статус. */
    status: SyncTaskStatus;
}

/**
 * Состояние для health.
 */
export interface SyncRuntimeState {
    /** Конфиг процесса. */
    configuration: {
        /** Порт. */
        appPort: number | null;
        /** Имя листа. */
        googleSheetName: string | null;
        /** Сколько таблиц в конфиге. */
        spreadsheetTargets: number;
        /** Таймзона. */
        timeZone: string | null;
        /** URL WB API. */
        wbApiUrl: string | null;
    };
    /** Состояние Google Sheets. */
    googleSheetsSync: SyncTaskState;
    /** Следующий запуск. */
    nextRunAt: string | null;
    /** Старт процесса. */
    startedAt: string;
    /** Состояние WB. */
    wbSync: SyncTaskState;
}

/**
 * Монитор синков.
 */
export interface SyncMonitor {
    /**
     * Завершает задачу.
     *
     * @param taskName Имя задачи.
     * @param status Статус.
     * @param details Детали.
     */
    markTaskFinished(
        taskName: SyncTaskName,
        status: Exclude<SyncTaskStatus, "idle" | "running">,
        details?: Record<string, unknown>,
    ): void;
    /**
     * Помечает запуск.
     *
     * @param taskName Имя задачи.
     * @param details Детали.
     */
    markTaskStarted(taskName: SyncTaskName, details?: Record<string, unknown>): void;
    /**
     * Обновляет конфиг.
     *
     * @param configuration Часть конфига.
     */
    setConfiguration(configuration: Partial<SyncRuntimeState["configuration"]>): void;
    /**
     * Пишет время следующего запуска.
     *
     * @param nextRunAt Время запуска или `null`.
     */
    setNextRunAt(nextRunAt: Date | null): void;
}
