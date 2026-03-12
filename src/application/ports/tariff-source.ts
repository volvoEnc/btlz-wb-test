import type { DailyTariffSnapshot } from "#domain/tariffs/entities/daily-tariff-snapshot.js";

/**
 * Источник тарифов.
 */
export interface TariffSource {
    /**
     * Загружает тарифы за день.
     *
     * @param tariffDate Дата `YYYY-MM-DD`.
     */
    fetchDailyTariffs(tariffDate: string): Promise<DailyTariffSnapshot>;
    /**
     * Проверяет конфиг.
     */
    isConfigured(): boolean;
}
