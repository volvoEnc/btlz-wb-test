import type { SpreadsheetTargetRepository } from "#application/ports/spreadsheet-target-repository.js";
import { type SyncTrigger, SyncDailyWbTariffsUseCase } from "#application/use-cases/sync-daily-wb-tariffs.use-case.js";
import { SyncCurrentTariffsToSpreadsheetsUseCase } from "#application/use-cases/sync-current-tariffs-to-spreadsheets.use-case.js";

/**
 * Зависимости полного цикла.
 */
interface RunTariffSyncCycleDependencies {
    /** ID таблиц из конфига. */
    configuredSpreadsheetIds: string[];
    /** Имя листа. */
    defaultSheetName: string;
    /** Репозиторий таблиц. */
    spreadsheetTargetRepository: SpreadsheetTargetRepository;
    /** Выгрузка в таблицы. */
    syncCurrentTariffsToSpreadsheetsUseCase: SyncCurrentTariffsToSpreadsheetsUseCase;
    /** Загрузка WB. */
    syncDailyWbTariffsUseCase: SyncDailyWbTariffsUseCase;
}

/**
 * Команда полного цикла.
 */
export interface RunTariffSyncCycleCommand {
    /** Дата. */
    businessDate: string;
    /** Причина запуска. */
    trigger: SyncTrigger;
}

/**
 * Полный цикл: WB + Sheets.
 */
export class RunTariffSyncCycleUseCase {
    /**
     * @param dependencies Зависимости.
     */
    public constructor(private readonly dependencies: RunTariffSyncCycleDependencies) {}

    /**
     * Запускает цикл.
     *
     * @param command Команда.
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
