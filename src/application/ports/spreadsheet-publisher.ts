import type { TariffSpreadsheetView } from "#application/dto/tariff-spreadsheet-view.js";
import type { SpreadsheetTarget } from "#domain/spreadsheets/entities/spreadsheet-target.js";

/**
 * Публикация в таблицы.
 */
export interface SpreadsheetPublisher {
    /**
     * Проверяет конфиг.
     */
    isConfigured(): boolean;
    /**
     * Пишет тарифы в таблицу.
     *
     * @param target Цель.
     * @param view Данные.
     */
    publishTariffs(target: SpreadsheetTarget, view: TariffSpreadsheetView): Promise<void>;
}
