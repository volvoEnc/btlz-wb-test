/**
 * Целевая Google-таблица для синхронизации тарифов.
 */
export interface SpreadsheetTarget {
    /** Имя листа внутри таблицы. */
    sheetName: string;
    /** Идентификатор Google Spreadsheet. */
    spreadsheetId: string;
}

/**
 * Результат последней попытки синхронизации таблицы.
 */
export type SpreadsheetSyncStatus = "success" | "error" | "skipped";
