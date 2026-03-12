import { RunTariffSyncCycleUseCase } from "#application/use-cases/run-tariff-sync-cycle.use-case.js";
import type { SyncTrigger } from "#application/use-cases/sync-daily-wb-tariffs.use-case.js";
import type { SyncMonitor } from "#application/ports/sync-monitor.js";
import { formatDateInTimeZone, getNextHourBoundary } from "#utils/date.js";
import { logger } from "#utils/logger.js";

/**
 * Конфиг планировщика.
 */
interface HourlySyncSchedulerConfig {
    /** Интервал, минут. */
    fetchIntervalMinutes: number;
    /** Монитор. */
    monitor: SyncMonitor;
    /** Полный цикл. */
    runTariffSyncCycleUseCase: RunTariffSyncCycleUseCase;
    /** Таймзона. */
    timeZone: string;
}

/**
 * Почасовой планировщик.
 */
export class HourlySyncScheduler {
    private intervalHandle: NodeJS.Timeout | null = null;
    private isRunning = false;
    private nextRunAt = getNextHourBoundary(new Date());
    private startupHandle: NodeJS.Timeout | null = null;

    public constructor(private readonly config: HourlySyncSchedulerConfig) {}

    /**
     * Возвращает следующий запуск.
     */
    public getNextRunAt(): Date {
        return this.nextRunAt;
    }

    /**
     * Запускает сразу.
     *
     * @param trigger Причина.
     */
    public async runNow(trigger: SyncTrigger): Promise<void> {
        await this.execute(trigger);
    }

    /**
     * Стартует расписание.
     */
    public start(): void {
        const now = new Date();
        this.nextRunAt = getNextHourBoundary(now);
        this.config.monitor.setNextRunAt(this.nextRunAt);

        const delayToNextRun = this.nextRunAt.getTime() - now.getTime();

        this.startupHandle = setTimeout(() => {
            void this.execute("hourly");
            this.nextRunAt = new Date(Date.now() + this.config.fetchIntervalMinutes * 60_000);
            this.config.monitor.setNextRunAt(this.nextRunAt);

            this.intervalHandle = setInterval(() => {
                this.nextRunAt = new Date(Date.now() + this.config.fetchIntervalMinutes * 60_000);
                this.config.monitor.setNextRunAt(this.nextRunAt);
                void this.execute("hourly");
            }, this.config.fetchIntervalMinutes * 60_000);
        }, delayToNextRun);

        logger.info("scheduler", "Hourly scheduler started", {
            fetchIntervalMinutes: this.config.fetchIntervalMinutes,
            nextRunAt: this.nextRunAt.toISOString(),
        });
    }

    /**
     * Останавливает таймеры.
     */
    public async stop(): Promise<void> {
        if (this.startupHandle) {
            clearTimeout(this.startupHandle);
            this.startupHandle = null;
        }

        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }

        this.config.monitor.setNextRunAt(null);
    }

    /**
     * Выполняет один цикл.
     *
     * @param trigger Причина.
     */
    private async execute(trigger: SyncTrigger): Promise<void> {
        if (this.isRunning) {
            logger.warn("scheduler", "Previous sync cycle is still running. Skipping overlapping launch.");
            return;
        }

        this.isRunning = true;

        try {
            await this.config.runTariffSyncCycleUseCase.execute({
                businessDate: formatDateInTimeZone(new Date(), this.config.timeZone),
                trigger,
            });
        } finally {
            this.isRunning = false;
        }
    }
}
