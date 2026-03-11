import type { SpreadsheetSyncStatus, SpreadsheetTarget } from "#domain/spreadsheets/entities/spreadsheet-target.js";

/**
 * Порт доступа к целям синхронизации Google Sheets.
 */
export interface SpreadsheetTargetRepository {
    /**
     * Возвращает все активные таблицы, в которые нужно выгружать тарифы.
     */
    getEnabledTargets(): Promise<SpreadsheetTarget[]>;
    /**
     * Сохраняет результат последней синхронизации для конкретной таблицы.
     *
     * @param spreadsheetId Идентификатор таблицы.
     * @param status Финальный статус синхронизации.
     * @param errorMessage Текст ошибки, если синхронизация завершилась неуспешно.
     */
    saveSyncResult(spreadsheetId: string, status: SpreadsheetSyncStatus, errorMessage?: string): Promise<void>;
    /**
     * Синхронизирует список активных таблиц в хранилище с конфигурацией приложения.
     *
     * @param spreadsheetIds Набор spreadsheet ID из конфигурации.
     * @param sheetName Имя листа, куда публикуются тарифы.
     */
    syncConfiguredTargets(spreadsheetIds: string[], sheetName: string): Promise<void>;
}
