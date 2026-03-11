import type { WarehouseTariff } from "#domain/tariffs/entities/warehouse-tariff.js";

/**
 * Актуальный снимок тарифов WB за одну бизнес-дату.
 */
export interface DailyTariffSnapshot {
    /** Дата следующего изменения тарифов коробов. */
    dtNextBox: string;
    /** Дата, до которой действует максимальный тариф. */
    dtTillMax: string;
    /** Момент фактической загрузки данных из WB API. */
    fetchedAt: string;
    /** Исходный payload WB API для аудита и диагностики. */
    sourcePayload: unknown;
    /** Бизнес-дата, к которой относится снимок тарифа. */
    tariffDate: string;
    /** Набор тарифов по складам за указанную дату. */
    warehouses: WarehouseTariff[];
}
