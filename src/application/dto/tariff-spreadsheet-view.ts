/**
 * Строка представления тарифа для выгрузки в Google Sheets.
 */
export interface TariffSpreadsheetRow {
    /** Базовая стоимость доставки короба. */
    boxDeliveryBase: string | null;
    /** Коэффициент доставки короба. */
    boxDeliveryCoefExpr: string | null;
    /** Стоимость доставки за литр. */
    boxDeliveryLiter: string | null;
    /** Базовая стоимость доставки силами маркетплейса. */
    boxDeliveryMarketplaceBase: string | null;
    /** Коэффициент доставки силами маркетплейса. */
    boxDeliveryMarketplaceCoefExpr: string | null;
    /** Стоимость литра доставки силами маркетплейса. */
    boxDeliveryMarketplaceLiter: string | null;
    /** Базовая стоимость хранения. */
    boxStorageBase: string | null;
    /** Коэффициент хранения. */
    boxStorageCoefExpr: string | null;
    /** Стоимость хранения за литр. */
    boxStorageLiter: string | null;
    /** Дата следующего изменения тарифов коробов. */
    dtNextBox: string;
    /** Дата окончания действия максимального тарифа. */
    dtTillMax: string;
    /** Региональное название склада. */
    geoName: string;
    /** Бизнес-дата тарифа. */
    tariffDate: string;
    /** Время последнего обновления строки в БД. */
    updatedAt: string;
    /** Наименование склада WB. */
    warehouseName: string;
}

/**
 * Готовое представление снимка тарифа для экспорта.
 */
export interface TariffSpreadsheetView {
    /** Строки выгрузки. */
    rows: TariffSpreadsheetRow[];
    /** Дата снимка, который лег в основу выгрузки. */
    sourceDate: string;
}
