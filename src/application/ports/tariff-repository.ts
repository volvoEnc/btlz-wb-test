import type { TariffSpreadsheetView } from "#application/dto/tariff-spreadsheet-view.js";
import type { DailyTariffSnapshot } from "#domain/tariffs/entities/daily-tariff-snapshot.js";
import type { TariffCoefficientField } from "#domain/tariffs/value-objects/tariff-coefficient-field.js";

/**
 * Порт хранения и чтения тарифов.
 */
export interface TariffRepository {
    /**
     * Возвращает последнее доступное представление тарифа для экспорта в таблицы.
     *
     * @param preferredDate Предпочтительная бизнес-дата.
     * @param sortBy Поле сортировки по коэффициенту.
     */
    getLatestSpreadsheetView(preferredDate: string, sortBy: TariffCoefficientField): Promise<TariffSpreadsheetView | null>;
    /**
     * Сохраняет или обновляет снимок тарифа за день.
     *
     * @param snapshot Снимок тарифа за бизнес-дату.
     */
    saveDailySnapshot(snapshot: DailyTariffSnapshot): Promise<void>;
}
