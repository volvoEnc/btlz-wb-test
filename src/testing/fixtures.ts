import type { TariffSpreadsheetView } from "#application/dto/tariff-spreadsheet-view.js";
import type { SpreadsheetTarget } from "#domain/spreadsheets/entities/spreadsheet-target.js";
import type { DailyTariffSnapshot } from "#domain/tariffs/entities/daily-tariff-snapshot.js";

/**
 * Возвращает пример снимка тарифа WB за день.
 */
export function createDailyTariffSnapshotFixture(): DailyTariffSnapshot {
    return {
        dtNextBox: "2026-03-12",
        dtTillMax: "2026-03-31",
        fetchedAt: "2026-03-11T10:00:00.000Z",
        sourcePayload: {
            response: {
                data: {
                    dtNextBox: "2026-03-12",
                    dtTillMax: "2026-03-31",
                    warehouseList: [],
                },
            },
        },
        tariffDate: "2026-03-11",
        warehouses: [
            {
                boxDeliveryBase: 12.5,
                boxDeliveryCoefExpr: 1.2,
                boxDeliveryLiter: 3.1,
                boxDeliveryMarketplaceBase: 14.2,
                boxDeliveryMarketplaceCoefExpr: 1.4,
                boxDeliveryMarketplaceLiter: 3.7,
                boxStorageBase: 4.8,
                boxStorageCoefExpr: 0.9,
                boxStorageLiter: 1.1,
                geoName: "Москва",
                warehouseName: "Коледино",
            },
        ],
    };
}

/**
 * Возвращает пример представления тарифа для Google Sheets.
 */
export function createTariffSpreadsheetViewFixture(): TariffSpreadsheetView {
    return {
        rows: [
            {
                boxDeliveryBase: "12.5",
                boxDeliveryCoefExpr: "1.2",
                boxDeliveryLiter: "3.1",
                boxDeliveryMarketplaceBase: "14.2",
                boxDeliveryMarketplaceCoefExpr: "1.4",
                boxDeliveryMarketplaceLiter: "3.7",
                boxStorageBase: "4.8",
                boxStorageCoefExpr: "0.9",
                boxStorageLiter: "1.1",
                dtNextBox: "2026-03-12",
                dtTillMax: "2026-03-31",
                geoName: "Москва",
                tariffDate: "2026-03-11",
                updatedAt: "2026-03-11T10:00:00.000Z",
                warehouseName: "Коледино",
            },
        ],
        sourceDate: "2026-03-11",
    };
}

/**
 * Возвращает набор активных таблиц для синхронизации.
 */
export function createSpreadsheetTargetsFixture(): SpreadsheetTarget[] {
    return [
        {
            sheetName: "stocks_coefs",
            spreadsheetId: "spreadsheet-1",
        },
        {
            sheetName: "stocks_coefs",
            spreadsheetId: "spreadsheet-2",
        },
    ];
}
