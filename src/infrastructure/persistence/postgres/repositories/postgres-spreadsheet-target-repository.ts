import type { SpreadsheetTargetRepository } from "#application/ports/spreadsheet-target-repository.js";
import type { SpreadsheetSyncStatus, SpreadsheetTarget } from "#domain/spreadsheets/entities/spreadsheet-target.js";
import type { Knex } from "knex";

/**
 * Репозиторий таблиц в PostgreSQL.
 */
export class PostgresSpreadsheetTargetRepository implements SpreadsheetTargetRepository {
    /**
     * @param knex Подключение knex.
     */
    public constructor(private readonly knex: Knex) {}

    /**
     * @inheritdoc
     */
    public async getEnabledTargets(): Promise<SpreadsheetTarget[]> {
        const rows = await this.knex("spreadsheets")
            .select({
                sheetName: "sheet_name",
                spreadsheetId: "spreadsheet_id",
            })
            .where({ enabled: true })
            .orderBy("spreadsheet_id", "asc");

        return rows;
    }

    /**
     * @inheritdoc
     */
    public async saveSyncResult(
        spreadsheetId: string,
        status: SpreadsheetSyncStatus,
        errorMessage?: string,
    ): Promise<void> {
        const payload: Record<string, unknown> = {
            last_sync_error: errorMessage ?? null,
            last_sync_status: status,
            updated_at: this.knex.fn.now(),
        };

        if (status === "success") {
            payload.last_synced_at = this.knex.fn.now();
        }

        await this.knex("spreadsheets").where({ spreadsheet_id: spreadsheetId }).update(payload);
    }

    /**
     * @inheritdoc
     */
    public async syncConfiguredTargets(spreadsheetIds: string[], sheetName: string): Promise<void> {
        await this.knex.transaction(async (transaction) => {
            const now = transaction.fn.now();

            if (spreadsheetIds.length > 0) {
                await transaction("spreadsheets")
                    .insert(
                        spreadsheetIds.map((spreadsheetId) => ({
                            created_at: now,
                            enabled: true,
                            sheet_name: sheetName,
                            spreadsheet_id: spreadsheetId,
                            updated_at: now,
                        })),
                    )
                    .onConflict("spreadsheet_id")
                    .merge({
                        enabled: true,
                        sheet_name: sheetName,
                        updated_at: now,
                    });

                await transaction("spreadsheets").whereNotIn("spreadsheet_id", spreadsheetIds).update({
                    enabled: false,
                    updated_at: now,
                });
                return;
            }

            await transaction("spreadsheets").update({
                enabled: false,
                updated_at: now,
            });
        });
    }
}
