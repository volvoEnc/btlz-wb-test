/**
 * Строка для Google Sheets.
 */
export interface TariffSpreadsheetRow {
    /** База доставки. */
    boxDeliveryBase: string | null;
    /** Коэффициент доставки. */
    boxDeliveryCoefExpr: string | null;
    /** Доставка за литр. */
    boxDeliveryLiter: string | null;
    /** База доставки МП. */
    boxDeliveryMarketplaceBase: string | null;
    /** Коэффициент доставки МП. */
    boxDeliveryMarketplaceCoefExpr: string | null;
    /** Доставка МП за литр. */
    boxDeliveryMarketplaceLiter: string | null;
    /** База хранения. */
    boxStorageBase: string | null;
    /** Коэффициент хранения. */
    boxStorageCoefExpr: string | null;
    /** Хранение за литр. */
    boxStorageLiter: string | null;
    /** Следующая дата изменения. */
    dtNextBox: string | null;
    /** Дата max-тарифа. */
    dtTillMax: string | null;
    /** География. */
    geoName: string;
    /** Дата тарифа. */
    tariffDate: string;
    /** Когда обновили в БД. */
    updatedAt: string;
    /** Склад. */
    warehouseName: string;
}

/**
 * Данные для выгрузки.
 */
export interface TariffSpreadsheetView {
    /** Строки. */
    rows: TariffSpreadsheetRow[];
    /** Дата источника. */
    sourceDate: string;
}
