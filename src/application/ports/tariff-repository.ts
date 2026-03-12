import type { TariffSpreadsheetView } from "#application/dto/tariff-spreadsheet-view.js";
import type { DailyTariffSnapshot } from "#domain/tariffs/entities/daily-tariff-snapshot.js";
import type { TariffCoefficientField } from "#domain/tariffs/value-objects/tariff-coefficient-field.js";

/**
 * Хранилище тарифов.
 */
export interface TariffRepository {
    /**
     * Возвращает данные для выгрузки.
     *
     * @param preferredDate Нужная дата.
     * @param sortBy Поле сортировки.
     */
    getLatestSpreadsheetView(preferredDate: string, sortBy: TariffCoefficientField): Promise<TariffSpreadsheetView | null>;
    /**
     * Сохраняет снимок за день.
     *
     * @param snapshot Снимок тарифа.
     */
    saveDailySnapshot(snapshot: DailyTariffSnapshot): Promise<void>;
}
