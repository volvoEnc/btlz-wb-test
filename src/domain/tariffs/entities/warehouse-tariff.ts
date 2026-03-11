/**
 * Тариф WB по конкретному складу.
 */
export interface WarehouseTariff {
    /** Базовая стоимость доставки короба. */
    boxDeliveryBase: number | null;
    /** Коэффициент доставки короба. */
    boxDeliveryCoefExpr: number | null;
    /** Стоимость доставки за литр. */
    boxDeliveryLiter: number | null;
    /** Базовая стоимость доставки силами маркетплейса. */
    boxDeliveryMarketplaceBase: number | null;
    /** Коэффициент доставки силами маркетплейса. */
    boxDeliveryMarketplaceCoefExpr: number | null;
    /** Стоимость литра доставки силами маркетплейса. */
    boxDeliveryMarketplaceLiter: number | null;
    /** Базовая стоимость хранения. */
    boxStorageBase: number | null;
    /** Коэффициент хранения. */
    boxStorageCoefExpr: number | null;
    /** Стоимость хранения за литр. */
    boxStorageLiter: number | null;
    /** Региональное название склада. */
    geoName: string;
    /** Наименование склада WB. */
    warehouseName: string;
}
