import type { TariffSpreadsheetView } from "#application/dto/tariff-spreadsheet-view.js";
import type { SpreadsheetTarget } from "#domain/spreadsheets/entities/spreadsheet-target.js";

/**
 * Порт публикации тарифов в внешнюю табличную систему.
 */
export interface SpreadsheetPublisher {
    /**
     * Возвращает `true`, если publisher готов к работе и имеет нужные credentials.
     */
    isConfigured(): boolean;
    /**
     * Публикует подготовленное представление тарифа в конкретную таблицу.
     *
     * @param target Целевая таблица.
     * @param view Подготовленное представление тарифа.
     */
    publishTariffs(target: SpreadsheetTarget, view: TariffSpreadsheetView): Promise<void>;
}
