/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    await knex.schema.alterTable("wb_box_tariff_snapshots", (table) => {
        table.date("dt_next_box").nullable().alter();
        table.date("dt_till_max").nullable().alter();
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    await knex.schema.alterTable("wb_box_tariff_snapshots", (table) => {
        table.date("dt_next_box").notNullable().alter();
        table.date("dt_till_max").notNullable().alter();
    });
}
