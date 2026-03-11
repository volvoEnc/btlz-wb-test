import type { TariffSpreadsheetView } from "#application/dto/tariff-spreadsheet-view.js";
import type { TariffRepository } from "#application/ports/tariff-repository.js";
import type { DailyTariffSnapshot } from "#domain/tariffs/entities/daily-tariff-snapshot.js";
import type { TariffCoefficientField } from "#domain/tariffs/value-objects/tariff-coefficient-field.js";
import type { Knex } from "knex";

/**
 * Маппинг доменного поля сортировки на имя колонки в PostgreSQL.
 */
const sortColumnMap: Record<TariffCoefficientField, string> = {
    box_delivery_coef_expr: "box_delivery_coef_expr",
    box_delivery_marketplace_coef_expr: "box_delivery_marketplace_coef_expr",
    box_storage_coef_expr: "box_storage_coef_expr",
};

/**
 * Нормализует дату/время из PostgreSQL в ISO-строку.
 *
 * @param value Значение из драйвера БД.
 */
const toIsoString = (value: unknown): string => {
    if (value instanceof Date) {
        return value.toISOString();
    }

    return String(value);
};

/**
 * PostgreSQL-реализация репозитория тарифов.
 */
export class PostgresTariffRepository implements TariffRepository {
    /**
     * @param knex Подключение knex к PostgreSQL.
     */
    public constructor(private readonly knex: Knex) {}

    /**
     * @inheritdoc
     */
    public async getLatestSpreadsheetView(
        preferredDate: string,
        sortBy: TariffCoefficientField,
    ): Promise<TariffSpreadsheetView | null> {
        const sourceDateRecord =
            (await this.knex("wb_box_tariff_snapshots")
                .select({ sourceDate: "tariff_date" })
                .where({ tariff_date: preferredDate })
                .first()) ??
            (await this.knex("wb_box_tariff_snapshots")
                .select({ sourceDate: "tariff_date" })
                .orderBy("tariff_date", "desc")
                .first());

        if (!sourceDateRecord?.sourceDate) {
            return null;
        }

        const sourceDate = String(sourceDateRecord.sourceDate);
        const sortColumn = sortColumnMap[sortBy];

        const rows = await this.knex("wb_box_tariff_warehouses as warehouses")
            .join("wb_box_tariff_snapshots as snapshots", "snapshots.tariff_date", "warehouses.tariff_date")
            .select({
                boxDeliveryBase: "warehouses.box_delivery_base",
                boxDeliveryCoefExpr: "warehouses.box_delivery_coef_expr",
                boxDeliveryLiter: "warehouses.box_delivery_liter",
                boxDeliveryMarketplaceBase: "warehouses.box_delivery_marketplace_base",
                boxDeliveryMarketplaceCoefExpr: "warehouses.box_delivery_marketplace_coef_expr",
                boxDeliveryMarketplaceLiter: "warehouses.box_delivery_marketplace_liter",
                boxStorageBase: "warehouses.box_storage_base",
                boxStorageCoefExpr: "warehouses.box_storage_coef_expr",
                boxStorageLiter: "warehouses.box_storage_liter",
                dtNextBox: "snapshots.dt_next_box",
                dtTillMax: "snapshots.dt_till_max",
                geoName: "warehouses.geo_name",
                tariffDate: "warehouses.tariff_date",
                updatedAt: "warehouses.updated_at",
                warehouseName: "warehouses.warehouse_name",
            })
            .where("warehouses.tariff_date", sourceDate)
            .orderByRaw("warehouses.?? asc nulls last, warehouses.warehouse_name asc", [sortColumn]);

        return {
            rows: rows.map((row) => ({
                ...row,
                dtNextBox: String(row.dtNextBox),
                dtTillMax: String(row.dtTillMax),
                tariffDate: String(row.tariffDate),
                updatedAt: toIsoString(row.updatedAt),
            })),
            sourceDate,
        };
    }

    /**
     * @inheritdoc
     */
    public async saveDailySnapshot(snapshot: DailyTariffSnapshot): Promise<void> {
        await this.knex.transaction(async (transaction) => {
            const now = transaction.fn.now();

            await transaction("wb_box_tariff_snapshots")
                .insert({
                    created_at: now,
                    dt_next_box: snapshot.dtNextBox,
                    dt_till_max: snapshot.dtTillMax,
                    fetched_at: snapshot.fetchedAt,
                    source_payload: snapshot.sourcePayload as Record<string, unknown>,
                    tariff_date: snapshot.tariffDate,
                    updated_at: now,
                })
                .onConflict("tariff_date")
                .merge({
                    dt_next_box: snapshot.dtNextBox,
                    dt_till_max: snapshot.dtTillMax,
                    fetched_at: snapshot.fetchedAt,
                    source_payload: snapshot.sourcePayload as Record<string, unknown>,
                    updated_at: now,
                });

            if (snapshot.warehouses.length === 0) {
                await transaction("wb_box_tariff_warehouses").where({ tariff_date: snapshot.tariffDate }).del();
                return;
            }

            await transaction("wb_box_tariff_warehouses")
                .insert(
                    snapshot.warehouses.map((warehouse) => ({
                        box_delivery_base: warehouse.boxDeliveryBase,
                        box_delivery_coef_expr: warehouse.boxDeliveryCoefExpr,
                        box_delivery_liter: warehouse.boxDeliveryLiter,
                        box_delivery_marketplace_base: warehouse.boxDeliveryMarketplaceBase,
                        box_delivery_marketplace_coef_expr: warehouse.boxDeliveryMarketplaceCoefExpr,
                        box_delivery_marketplace_liter: warehouse.boxDeliveryMarketplaceLiter,
                        box_storage_base: warehouse.boxStorageBase,
                        box_storage_coef_expr: warehouse.boxStorageCoefExpr,
                        box_storage_liter: warehouse.boxStorageLiter,
                        created_at: now,
                        geo_name: warehouse.geoName,
                        tariff_date: snapshot.tariffDate,
                        updated_at: now,
                        warehouse_name: warehouse.warehouseName,
                    })),
                )
                .onConflict(["tariff_date", "warehouse_name"])
                .merge([
                    "box_delivery_base",
                    "box_delivery_coef_expr",
                    "box_delivery_liter",
                    "box_delivery_marketplace_base",
                    "box_delivery_marketplace_coef_expr",
                    "box_delivery_marketplace_liter",
                    "box_storage_base",
                    "box_storage_coef_expr",
                    "box_storage_liter",
                    "geo_name",
                    "updated_at",
                ]);

            await transaction("wb_box_tariff_warehouses")
                .where({ tariff_date: snapshot.tariffDate })
                .whereNotIn(
                    "warehouse_name",
                    snapshot.warehouses.map((warehouse) => warehouse.warehouseName),
                )
                .del();
        });
    }
}
