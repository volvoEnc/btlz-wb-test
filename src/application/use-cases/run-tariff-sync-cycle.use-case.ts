import type { SpreadsheetTargetRepository } from "#application/ports/spreadsheet-target-repository.js";
import { type SyncTrigger, SyncDailyWbTariffsUseCase } from "#application/use-cases/sync-daily-wb-tariffs.use-case.js";
import { SyncCurrentTariffsToSpreadsheetsUseCase } from "#application/use-cases/sync-current-tariffs-to-spreadsheets.use-case.js";

/**
 * Зависимости оркестратора полного цикла синхронизации.
 */
interface RunTariffSyncCycleDependencies {
    /** Spreadsheet IDs из runtime-конфигурации. */
    configuredSpreadsheetIds: string[];
    /** Имя листа по умолчанию. */
    defaultSheetName: string;
    /** Репозиторий целевых таблиц. */
    spreadsheetTargetRepository: SpreadsheetTargetRepository;
    /** Сценарий публикации в таблицы. */
    syncCurrentTariffsToSpreadsheetsUseCase: SyncCurrentTariffsToSpreadsheetsUseCase;
    /** Сценарий загрузки тарифов WB. */
    syncDailyWbTariffsUseCase: SyncDailyWbTariffsUseCase;
}

/**
 * Команда полного цикла синхронизации тарифов.
 */
export interface RunTariffSyncCycleCommand {
    /** Бизнес-дата цикла. */
    businessDate: string;
    /** Тип запуска цикла. */
    trigger: SyncTrigger;
}

/**
 * Оркестратор полного цикла: обновление списка таблиц, загрузка WB и публикация в Sheets.
 */
export class RunTariffSyncCycleUseCase {
    /**
     * @param dependencies Подключенные use case'ы и репозитории.
     */
    public constructor(private readonly dependencies: RunTariffSyncCycleDependencies) {}

    /**
     * Выполняет полный цикл синхронизации тарифа.
     *
     * @param command Команда выполнения сценария.
     */
    public async execute(command: RunTariffSyncCycleCommand): Promise<void> {
        const {
            configuredSpreadsheetIds,
            defaultSheetName,
            spreadsheetTargetRepository,
            syncCurrentTariffsToSpreadsheetsUseCase,
            syncDailyWbTariffsUseCase,
        } = this.dependencies;

        await spreadsheetTargetRepository.syncConfiguredTargets(configuredSpreadsheetIds, defaultSheetName);

        await syncDailyWbTariffsUseCase.execute({
            businessDate: command.businessDate,
            trigger: command.trigger,
        });

        await syncCurrentTariffsToSpreadsheetsUseCase.execute({
            preferredDate: command.businessDate,
        });
    }
}
