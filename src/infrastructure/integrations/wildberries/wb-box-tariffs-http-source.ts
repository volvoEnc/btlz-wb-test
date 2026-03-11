import type { TariffSource } from "#application/ports/tariff-source.js";
import type { DailyTariffSnapshot } from "#domain/tariffs/entities/daily-tariff-snapshot.js";
import type { WarehouseTariff } from "#domain/tariffs/entities/warehouse-tariff.js";
import { z } from "zod";

/**
 * Zod-схема одной строки тарифа WB по складу.
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
 * Zod-схема ответа WB API `tariffs/box`.
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
 * Конфигурация HTTP-адаптера Wildberries API.
 */
interface WbBoxTariffsHttpSourceConfig {
    /** URL endpoint WB API. */
    apiUrl: string;
    /** Таймаут HTTP-запроса в миллисекундах. */
    requestTimeoutMs: number;
    /** Токен авторизации WB API. */
    token?: string;
}

/**
 * Преобразует строковое значение WB в число с учетом локали ответа.
 *
 * @param value Значение поля тарифа из ответа WB.
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
 * Преобразует DTO ответа WB в доменную сущность тарифа по складу.
 *
 * @param warehouse Строка тарифа склада из WB API.
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
 * HTTP-адаптер получения тарифов коробов из Wildberries API.
 */
export class WbBoxTariffsHttpSource implements TariffSource {
    /**
     * @param config Конфигурация подключения к WB API.
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
                dtNextBox: payload.response.data.dtNextBox,
                dtTillMax: payload.response.data.dtTillMax,
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
