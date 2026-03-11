import type { DailyTariffSnapshot } from "#domain/tariffs/entities/daily-tariff-snapshot.js";

/**
 * Порт получения тарифов из внешнего источника.
 */
export interface TariffSource {
    /**
     * Загружает снимок тарифов за указанную бизнес-дату.
     *
     * @param tariffDate Дата тарифа в формате `YYYY-MM-DD`.
     */
    fetchDailyTariffs(tariffDate: string): Promise<DailyTariffSnapshot>;
    /**
     * Возвращает `true`, если источник готов к работе и имеет нужные credentials.
     */
    isConfigured(): boolean;
}
