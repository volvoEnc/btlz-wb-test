import type { SyncMonitor } from "#application/ports/sync-monitor.js";
import type { TariffRepository } from "#application/ports/tariff-repository.js";
import type { TariffSource } from "#application/ports/tariff-source.js";
import { logger } from "#utils/logger.js";

/**
 * Причина запуска.
 */
export type SyncTrigger = "hourly" | "startup";

/**
 * Зависимости загрузки WB.
 */
interface SyncDailyWbTariffsDependencies {
    /** Монитор. */
    monitor: SyncMonitor;
    /** Репозиторий тарифов. */
    tariffRepository: TariffRepository;
    /** Источник WB. */
    tariffSource: TariffSource;
}

/**
 * Команда загрузки.
 */
export interface SyncDailyWbTariffsCommand {
    /** Дата. */
    businessDate: string;
    /** Причина запуска. */
    trigger: SyncTrigger;
}

/**
 * Загружает тарифы WB.
 */
export class SyncDailyWbTariffsUseCase {
    /**
     * @param dependencies Зависимости.
     */
    public constructor(private readonly dependencies: SyncDailyWbTariffsDependencies) {}

    /**
     * Запускает загрузку.
     *
     * @param command Команда.
     */
    public async execute(command: SyncDailyWbTariffsCommand): Promise<void> {
        const { businessDate, trigger } = command;
        const { monitor, tariffRepository, tariffSource } = this.dependencies;

        monitor.markTaskStarted("wbSync", { businessDate, trigger });

        if (!tariffSource.isConfigured()) {
            monitor.markTaskFinished("wbSync", "skipped", {
                businessDate,
                message: "WB_API_TOKEN is not configured",
            });
            logger.warn("wb-sync", "WB_API_TOKEN is not configured. Skipping WB fetch.");
            return;
        }

        try {
            const snapshot = await tariffSource.fetchDailyTariffs(businessDate);
            await tariffRepository.saveDailySnapshot(snapshot);

            monitor.markTaskFinished("wbSync", "success", {
                businessDate,
                fetchedAt: snapshot.fetchedAt,
                warehouses: snapshot.warehouses.length,
            });

            logger.info("wb-sync", `WB tariffs synced for ${businessDate}`, {
                trigger,
                warehouses: snapshot.warehouses.length,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            monitor.markTaskFinished("wbSync", "error", {
                businessDate,
                error: errorMessage,
            });

            logger.error("wb-sync", "WB sync failed", { error: errorMessage });
        }
    }
}
