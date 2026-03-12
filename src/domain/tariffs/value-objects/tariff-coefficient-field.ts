/**
 * Поля сортировки.
 */
export const tariffCoefficientFields = [
    "box_delivery_coef_expr",
    "box_delivery_marketplace_coef_expr",
    "box_storage_coef_expr",
] as const;

/**
 * Поле коэффициента.
 */
export type TariffCoefficientField = (typeof tariffCoefficientFields)[number];
