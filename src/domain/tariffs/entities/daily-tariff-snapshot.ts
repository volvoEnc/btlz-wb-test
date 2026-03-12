import type { WarehouseTariff } from "#domain/tariffs/entities/warehouse-tariff.js";

/**
 * Снимок тарифов за день.
 */
export interface DailyTariffSnapshot {
    /** Следующая дата изменения. */
    dtNextBox: string | null;
    /** Дата max-тарифа. */
    dtTillMax: string | null;
    /** Когда получили ответ. */
    fetchedAt: string;
    /** Исходный payload. */
    sourcePayload: unknown;
    /** Дата тарифа. */
    tariffDate: string;
    /** Тарифы по складам. */
    warehouses: WarehouseTariff[];
}
