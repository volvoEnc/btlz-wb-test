import type { TariffSource } from "#application/ports/tariff-source.js";
import type { DailyTariffSnapshot } from "#domain/tariffs/entities/daily-tariff-snapshot.js";
import type { WarehouseTariff } from "#domain/tariffs/entities/warehouse-tariff.js";
import { z } from "zod";

/**
 * Схема строки склада.
 */
const warehouseTariffSchema = z.object({
    boxDeliveryBase: z.string(),
    boxDeliveryCoefExpr: z.string(),
    boxDeliveryLiter: z.string(),
    boxDeliveryMarketplaceBase: z.string(),
    boxDeliveryMarketplaceCoefExpr: z.string(),
    boxDeliveryMarketplaceLiter: z.string(),
    boxStorageBase: z.string(),
    boxStorageCoefExpr: z.string(),
    boxStorageLiter: z.string(),
    geoName: z.string(),
    warehouseName: z.string(),
});

/**
 * Схема ответа WB.
 */
const wbTariffResponseSchema = z.object({
    response: z.object({
        data: z.object({
            dtNextBox: z.string(),
            dtTillMax: z.string(),
            warehouseList: z.array(warehouseTariffSchema),
        }),
    }),
});

/**
 * Конфиг WB API.
 */
interface WbBoxTariffsHttpSourceConfig {
    /** URL. */
    apiUrl: string;
    /** Таймаут, мс. */
    requestTimeoutMs: number;
    /** Токен. */
    token?: string;
}

/**
 * Парсит число из WB.
 *
 * @param value Значение поля.
 */
function parseWbNumber(value: string): number | null {
    const normalizedValue = value.replace(/ /g, "").replace(",", ".").trim();

    if (normalizedValue.length === 0) {
        return null;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

/**
 * Пустую дату делает `null`.
 *
 * @param value Значение поля.
 */
function parseOptionalWbDate(value: string): string | null {
    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
}

/**
 * Маппит строку склада.
 *
 * @param warehouse Данные склада.
 */
function mapWarehouseTariff(warehouse: z.infer<typeof warehouseTariffSchema>): WarehouseTariff {
    return {
        boxDeliveryBase: parseWbNumber(warehouse.boxDeliveryBase),
        boxDeliveryCoefExpr: parseWbNumber(warehouse.boxDeliveryCoefExpr),
        boxDeliveryLiter: parseWbNumber(warehouse.boxDeliveryLiter),
        boxDeliveryMarketplaceBase: parseWbNumber(warehouse.boxDeliveryMarketplaceBase),
        boxDeliveryMarketplaceCoefExpr: parseWbNumber(warehouse.boxDeliveryMarketplaceCoefExpr),
        boxDeliveryMarketplaceLiter: parseWbNumber(warehouse.boxDeliveryMarketplaceLiter),
        boxStorageBase: parseWbNumber(warehouse.boxStorageBase),
        boxStorageCoefExpr: parseWbNumber(warehouse.boxStorageCoefExpr),
        boxStorageLiter: parseWbNumber(warehouse.boxStorageLiter),
        geoName: warehouse.geoName,
        warehouseName: warehouse.warehouseName,
    };
}

/**
 * Забирает тарифы из WB API.
 */
export class WbBoxTariffsHttpSource implements TariffSource {
    /**
     * @param config Конфиг.
     */
    public constructor(private readonly config: WbBoxTariffsHttpSourceConfig) {}

    /**
     * @inheritdoc
     */
    public isConfigured(): boolean {
        return Boolean(this.config.token);
    }

    /**
     * @inheritdoc
     */
    public async fetchDailyTariffs(tariffDate: string): Promise<DailyTariffSnapshot> {
        if (!this.config.token) {
            throw new Error("WB_API_TOKEN is not configured");
        }

        const requestUrl = new URL(this.config.apiUrl);
        requestUrl.searchParams.set("date", tariffDate);

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), this.config.requestTimeoutMs);

        try {
            const response = await fetch(requestUrl, {
                headers: {
                    Authorization: this.config.token,
                },
                method: "GET",
                signal: abortController.signal,
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`WB API returned ${response.status}: ${errorBody}`);
            }

            const payload = wbTariffResponseSchema.parse(await response.json());

            return {
                dtNextBox: parseOptionalWbDate(payload.response.data.dtNextBox),
                dtTillMax: parseOptionalWbDate(payload.response.data.dtTillMax),
                fetchedAt: new Date().toISOString(),
                sourcePayload: payload,
                tariffDate,
                warehouses: payload.response.data.warehouseList.map(mapWarehouseTariff),
            };
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
