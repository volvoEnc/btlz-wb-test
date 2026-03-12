import type { SpreadsheetSyncStatus, SpreadsheetTarget } from "#domain/spreadsheets/entities/spreadsheet-target.js";

/**
 * Хранилище таблиц.
 */
export interface SpreadsheetTargetRepository {
    /**
     * Возвращает активные таблицы.
     */
    getEnabledTargets(): Promise<SpreadsheetTarget[]>;
    /**
     * Пишет результат синка.
     *
     * @param spreadsheetId ID таблицы.
     * @param status Статус.
     * @param errorMessage Ошибка.
     */
    saveSyncResult(spreadsheetId: string, status: SpreadsheetSyncStatus, errorMessage?: string): Promise<void>;
    /**
     * Обновляет список таблиц из конфига.
     *
     * @param spreadsheetIds Список ID.
     * @param sheetName Имя листа.
     */
    syncConfiguredTargets(spreadsheetIds: string[], sheetName: string): Promise<void>;
}
