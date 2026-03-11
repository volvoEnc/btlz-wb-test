import { RunTariffSyncCycleUseCase } from "#application/use-cases/run-tariff-sync-cycle.use-case.js";
import type { SyncTrigger } from "#application/use-cases/sync-daily-wb-tariffs.use-case.js";
import type { SyncMonitor } from "#application/ports/sync-monitor.js";
import { formatDateInTimeZone, getNextHourBoundary } from "#utils/date.js";
import { logger } from "#utils/logger.js";

/**
 * Конфигурация почасового планировщика синхронизации.
 */
interface HourlySyncSchedulerConfig {
    /** Интервал планового запуска в минутах. */
    fetchIntervalMinutes: number;
    /** Монитор runtime-состояния. */
    monitor: SyncMonitor;
    /** Use case полного цикла синхронизации. */
    runTariffSyncCycleUseCase: RunTariffSyncCycleUseCase;
    /** Таймзона вычисления бизнес-даты. */
    timeZone: string;
}

/**
 * Планировщик, запускающий полный цикл синхронизации по расписанию.
 */
export class HourlySyncScheduler {
    private intervalHandle: NodeJS.Timeout | null = null;
    private isRunning = false;
    private nextRunAt = getNextHourBoundary(new Date());
    private startupHandle: NodeJS.Timeout | null = null;

    public constructor(private readonly config: HourlySyncSchedulerConfig) {}

    /**
     * Возвращает время следующего планового запуска.
     */
    public getNextRunAt(): Date {
        return this.nextRunAt;
    }

    /**
     * Запускает цикл синхронизации немедленно.
     *
     * @param trigger Причина запуска.
     */
    public async runNow(trigger: SyncTrigger): Promise<void> {
        await this.execute(trigger);
    }

    /**
     * Запускает расписание почасовой синхронизации.
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
     * Останавливает активные таймеры планировщика.
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
     * Выполняет один цикл синхронизации с защитой от пересечения запусков.
     *
     * @param trigger Причина запуска.
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
