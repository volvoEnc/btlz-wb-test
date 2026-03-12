import assert from "node:assert/strict";
import test from "node:test";
import type { Knex } from "knex";
import { PostgresTariffRepository } from "./postgres-tariff-repository.js";

test("PostgresTariffRepository normalizes PostgreSQL Date objects to YYYY-MM-DD", async () => {
    let warehousesWhereValue: unknown = null;

    const snapshotsQuery = {
        first: async () => ({
            sourceDate: new Date("2026-03-11T00:00:00.000Z"),
        }),
        select() {
            return this;
        },
        where() {
            return this;
        },
    };

    const warehousesQuery = {
        join() {
            return this;
        },
        orderByRaw: async () => [
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
                dtNextBox: new Date("2026-03-12T00:00:00.000Z"),
                dtTillMax: new Date("2026-03-31T00:00:00.000Z"),
                geoName: "Москва",
                tariffDate: new Date("2026-03-11T00:00:00.000Z"),
                updatedAt: new Date("2026-03-11T10:00:00.000Z"),
                warehouseName: "Коледино",
            },
        ],
        select() {
            return this;
        },
        where(_column: string, value: unknown) {
            warehousesWhereValue = value;
            return this;
        },
    };

    const knexDouble = ((tableName: string) => {
        if (tableName === "wb_box_tariff_snapshots") {
            return snapshotsQuery;
        }

        if (tableName === "wb_box_tariff_warehouses as warehouses") {
            return warehousesQuery;
        }

        throw new Error(`Unexpected table: ${tableName}`);
    }) as unknown as Knex;

    const repository = new PostgresTariffRepository(knexDouble);
    const view = await repository.getLatestSpreadsheetView("2026-03-11", "box_delivery_coef_expr");

    assert.equal(warehousesWhereValue, "2026-03-11");
    assert.equal(view?.sourceDate, "2026-03-11");
    assert.equal(view?.rows[0].tariffDate, "2026-03-11");
    assert.equal(view?.rows[0].dtNextBox, "2026-03-12");
    assert.equal(view?.rows[0].dtTillMax, "2026-03-31");
});
