/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    await knex.schema.alterTable("spreadsheets", (table) => {
        table.string("sheet_name").notNullable().defaultTo("stocks_coefs");
        table.boolean("enabled").notNullable().defaultTo(true);
        table.timestamp("last_synced_at", { useTz: true }).nullable();
        table.string("last_sync_status").nullable();
        table.text("last_sync_error").nullable();
        table.timestamps(true, true);
    });

    await knex.schema.createTable("wb_box_tariff_snapshots", (table) => {
        table.date("tariff_date").primary();
        table.date("dt_next_box").notNullable();
        table.date("dt_till_max").notNullable();
        table.timestamp("fetched_at", { useTz: true }).notNullable();
        table.jsonb("source_payload").notNullable();
        table.timestamps(true, true);
    });

    await knex.schema.createTable("wb_box_tariff_warehouses", (table) => {
        table.bigIncrements("id").primary();
        table.date("tariff_date").notNullable().references("tariff_date").inTable("wb_box_tariff_snapshots").onDelete("CASCADE");
        table.string("warehouse_name", 255).notNullable();
        table.string("geo_name", 255).notNullable();
        table.decimal("box_delivery_base", 12, 4).nullable();
        table.decimal("box_delivery_coef_expr", 12, 4).nullable();
        table.decimal("box_delivery_liter", 12, 4).nullable();
        table.decimal("box_delivery_marketplace_base", 12, 4).nullable();
        table.decimal("box_delivery_marketplace_coef_expr", 12, 4).nullable();
        table.decimal("box_delivery_marketplace_liter", 12, 4).nullable();
        table.decimal("box_storage_base", 12, 4).nullable();
        table.decimal("box_storage_coef_expr", 12, 4).nullable();
        table.decimal("box_storage_liter", 12, 4).nullable();
        table.timestamps(true, true);

        table.unique(["tariff_date", "warehouse_name"]);
        table.index(["tariff_date", "box_delivery_coef_expr"], "wb_box_tariff_warehouses_delivery_idx");
        table.index(
            ["tariff_date", "box_delivery_marketplace_coef_expr"],
            "wb_box_tariff_warehouses_marketplace_delivery_idx",
        );
        table.index(["tariff_date", "box_storage_coef_expr"], "wb_box_tariff_warehouses_storage_idx");
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    await knex.schema.dropTableIfExists("wb_box_tariff_warehouses");
    await knex.schema.dropTableIfExists("wb_box_tariff_snapshots");

    await knex.schema.alterTable("spreadsheets", (table) => {
        table.dropColumns("sheet_name", "enabled", "last_synced_at", "last_sync_status", "last_sync_error", "created_at", "updated_at");
    });
}
