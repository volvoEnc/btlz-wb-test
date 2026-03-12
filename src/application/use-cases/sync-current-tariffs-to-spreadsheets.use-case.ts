import type { SyncMonitor } from "#application/ports/sync-monitor.js";
import type { SpreadsheetPublisher } from "#application/ports/spreadsheet-publisher.js";
import type { SpreadsheetTargetRepository } from "#application/ports/spreadsheet-target-repository.js";
import type { TariffRepository } from "#application/ports/tariff-repository.js";
import type { TariffCoefficientField } from "#domain/tariffs/value-objects/tariff-coefficient-field.js";
import { logger } from "#utils/logger.js";

/**
 * Зависимости выгрузки в таблицы.
 */
interface SyncCurrentTariffsToSpreadsheetsDependencies {
    /** Монитор. */
    monitor: SyncMonitor;
    /** Поле сортировки. */
    sortByCoefficient: TariffCoefficientField;
    /** Публикатор. */
    spreadsheetPublisher: SpreadsheetPublisher;
    /** Репозиторий таблиц. */
    spreadsheetTargetRepository: SpreadsheetTargetRepository;
    /** Репозиторий тарифов. */
    tariffRepository: TariffRepository;
}

/**
 * Команда выгрузки в Sheets.
 */
export interface SyncCurrentTariffsToSpreadsheetsCommand {
    /** Нужная дата. */
    preferredDate: string;
}

/**
 * Выгружает тарифы в Sheets.
 */
export class SyncCurrentTariffsToSpreadsheetsUseCase {
    /**
     * @param dependencies Зависимости.
     */
    public constructor(private readonly dependencies: SyncCurrentTariffsToSpreadsheetsDependencies) {}

    /**
     * Запускает выгрузку.
     *
     * @param command Команда.
     */
    public async execute(command: SyncCurrentTariffsToSpreadsheetsCommand): Promise<void> {
        const { preferredDate } = command;
        const { monitor, sortByCoefficient, spreadsheetPublisher, spreadsheetTargetRepository, tariffRepository } = this.dependencies;
        const spreadsheetTargets = await spreadsheetTargetRepository.getEnabledTargets();

        monitor.markTaskStarted("googleSheetsSync", {
            preferredDate,
            spreadsheets: spreadsheetTargets.length,
        });

        if (spreadsheetTargets.length === 0) {
            monitor.markTaskFinished("googleSheetsSync", "skipped", {
                message: "No spreadsheet IDs configured",
                spreadsheets: 0,
            });
            logger.warn("google-sheets", "No spreadsheet IDs configured. Skipping sync.");
            return;
        }

        if (!spreadsheetPublisher.isConfigured()) {
            for (const target of spreadsheetTargets) {
                await spreadsheetTargetRepository.saveSyncResult(target.spreadsheetId, "skipped", "Google credentials are not configured");
            }

            monitor.markTaskFinished("googleSheetsSync", "skipped", {
                message: "Google credentials are not configured",
                spreadsheets: spreadsheetTargets.length,
            });
            logger.warn("google-sheets", "Google credentials are not configured. Skipping sync.");
            return;
        }

        const spreadsheetView = await tariffRepository.getLatestSpreadsheetView(preferredDate, sortByCoefficient);

        if (!spreadsheetView) {
            for (const target of spreadsheetTargets) {
                await spreadsheetTargetRepository.saveSyncResult(target.spreadsheetId, "skipped", "No tariff data available in PostgreSQL");
            }

            monitor.markTaskFinished("googleSheetsSync", "skipped", {
                message: "No tariff data available in PostgreSQL",
                spreadsheets: spreadsheetTargets.length,
            });
            logger.warn("google-sheets", "No tariff data available in PostgreSQL. Skipping sync.");
            return;
        }

        let syncedCount = 0;

        for (const target of spreadsheetTargets) {
            try {
                await spreadsheetPublisher.publishTariffs(target, spreadsheetView);
                await spreadsheetTargetRepository.saveSyncResult(target.spreadsheetId, "success");
                syncedCount += 1;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                await spreadsheetTargetRepository.saveSyncResult(target.spreadsheetId, "error", errorMessage);
                logger.error("google-sheets", `Failed to sync spreadsheet ${target.spreadsheetId}`, { error: errorMessage });
            }
        }

        monitor.markTaskFinished("googleSheetsSync", syncedCount === spreadsheetTargets.length ? "success" : "error", {
            rows: spreadsheetView.rows.length,
            sourceDate: spreadsheetView.sourceDate,
            syncedCount,
            spreadsheets: spreadsheetTargets.length,
        });
    }
}
