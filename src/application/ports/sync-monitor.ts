/**
 * Идентификатор отслеживаемой фоновой задачи.
 */
export type SyncTaskName = "googleSheetsSync" | "wbSync";
/**
 * Статус фоновой задачи.
 */
export type SyncTaskStatus = "idle" | "running" | "success" | "error" | "skipped";

/**
 * Текущее состояние фоновой задачи.
 */
export interface SyncTaskState {
    /** Момент завершения последнего запуска. */
    completedAt: string | null;
    /** Дополнительные метаданные по последнему запуску. */
    details: Record<string, unknown>;
    /** Текст ошибки последнего запуска, если он завершился неуспешно. */
    error: string | null;
    /** Момент начала последнего запуска. */
    startedAt: string | null;
    /** Финальный или текущий статус задачи. */
    status: SyncTaskStatus;
}

/**
 * Снимок runtime-состояния приложения для health endpoint.
 */
export interface SyncRuntimeState {
    /** Базовая конфигурация запущенного приложения. */
    configuration: {
        /** HTTP-порт health endpoint. */
        appPort: number | null;
        /** Имя листа Google Sheets по умолчанию. */
        googleSheetName: string | null;
        /** Количество целевых таблиц из конфигурации. */
        spreadsheetTargets: number;
        /** Таймзона расчёта бизнес-даты. */
        timeZone: string | null;
        /** URL источника WB API. */
        wbApiUrl: string | null;
    };
    /** Состояние последней синхронизации Google Sheets. */
    googleSheetsSync: SyncTaskState;
    /** Время следующего планового запуска. */
    nextRunAt: string | null;
    /** Момент старта процесса приложения. */
    startedAt: string;
    /** Состояние последней синхронизации WB. */
    wbSync: SyncTaskState;
}

/**
 * Порт мониторинга состояния фоновых синхронизаций.
 */
export interface SyncMonitor {
    /**
     * Завершает задачу с финальным статусом и метаданными.
     *
     * @param taskName Имя фоновой задачи.
     * @param status Итоговый статус выполнения.
     * @param details Дополнительные метаданные о выполнении.
     */
    markTaskFinished(
        taskName: SyncTaskName,
        status: Exclude<SyncTaskStatus, "idle" | "running">,
        details?: Record<string, unknown>,
    ): void;
    /**
     * Помечает задачу как запущенную.
     *
     * @param taskName Имя фоновой задачи.
     * @param details Метаданные запуска.
     */
    markTaskStarted(taskName: SyncTaskName, details?: Record<string, unknown>): void;
    /**
     * Обновляет конфигурационные данные runtime-состояния.
     *
     * @param configuration Частичное обновление runtime-конфигурации.
     */
    setConfiguration(configuration: Partial<SyncRuntimeState["configuration"]>): void;
    /**
     * Обновляет время следующего запуска планировщика.
     *
     * @param nextRunAt Следующее время запуска или `null`, если расписание остановлено.
     */
    setNextRunAt(nextRunAt: Date | null): void;
}
