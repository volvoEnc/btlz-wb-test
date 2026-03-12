/**
 * Тариф по складу.
 */
export interface WarehouseTariff {
    /** База доставки. */
    boxDeliveryBase: number | null;
    /** Коэффициент доставки. */
    boxDeliveryCoefExpr: number | null;
    /** Доставка за литр. */
    boxDeliveryLiter: number | null;
    /** База доставки МП. */
    boxDeliveryMarketplaceBase: number | null;
    /** Коэффициент доставки МП. */
    boxDeliveryMarketplaceCoefExpr: number | null;
    /** Доставка МП за литр. */
    boxDeliveryMarketplaceLiter: number | null;
    /** База хранения. */
    boxStorageBase: number | null;
    /** Коэффициент хранения. */
    boxStorageCoefExpr: number | null;
    /** Хранение за литр. */
    boxStorageLiter: number | null;
    /** География. */
    geoName: string;
    /** Склад. */
    warehouseName: string;
}
