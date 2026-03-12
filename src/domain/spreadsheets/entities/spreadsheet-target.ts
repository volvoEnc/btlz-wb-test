/**
 * Таблица для выгрузки.
 */
export interface SpreadsheetTarget {
    /** Имя листа. */
    sheetName: string;
    /** ID таблицы. */
    spreadsheetId: string;
}

/**
 * Статус последнего синка.
 */
export type SpreadsheetSyncStatus = "success" | "error" | "skipped";
