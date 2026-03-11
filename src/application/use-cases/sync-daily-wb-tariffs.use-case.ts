import type { SyncMonitor } from "#application/ports/sync-monitor.js";
import type { TariffRepository } from "#application/ports/tariff-repository.js";
import type { TariffSource } from "#application/ports/tariff-source.js";
import { logger } from "#utils/logger.js";

/**
 * Идентификатор происхождения запуска синхронизации.
 */
export type SyncTrigger = "hourly" | "startup";

/**
 * Зависимости сценария загрузки тарифов WB.
 */
interface SyncDailyWbTariffsDependencies {
    /** Монитор runtime-состояния. */
    monitor: SyncMonitor;
    /** Репозиторий сохранения тарифов. */
    tariffRepository: TariffRepository;
    /** Внешний источник тарифов WB. */
    tariffSource: TariffSource;
}

/**
 * Команда запуска сценария синхронизации дневного тарифа.
 */
export interface SyncDailyWbTariffsCommand {
    /** Бизнес-дата, за которую нужно получить тарифы. */
    businessDate: string;
    /** Тип запуска: стартовый или плановый. */
    trigger: SyncTrigger;
}

/**
 * Сценарий загрузки тарифов WB и сохранения их в хранилище.
 */
export class SyncDailyWbTariffsUseCase {
    /**
     * @param dependencies Подключенные порты приложения.
     */
    public constructor(private readonly dependencies: SyncDailyWbTariffsDependencies) {}

    /**
     * Выполняет загрузку тарифов WB за одну бизнес-дату.
     *
     * @param command Команда выполнения сценария.
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
