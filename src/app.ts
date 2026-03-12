import env from "#config/env/env.js";
import knex, { migrate } from "#postgres/knex.js";
import { RunTariffSyncCycleUseCase } from "#application/use-cases/run-tariff-sync-cycle.use-case.js";
import { SyncCurrentTariffsToSpreadsheetsUseCase } from "#application/use-cases/sync-current-tariffs-to-spreadsheets.use-case.js";
import { SyncDailyWbTariffsUseCase } from "#application/use-cases/sync-daily-wb-tariffs.use-case.js";
import { createHealthServer } from "#infrastructure/http/health-server.js";
import { GoogleSheetsPublisher } from "#infrastructure/integrations/google-sheets/google-sheets-publisher.js";
import { WbBoxTariffsHttpSource } from "#infrastructure/integrations/wildberries/wb-box-tariffs-http-source.js";
import { PostgresSpreadsheetTargetRepository } from "#infrastructure/persistence/postgres/repositories/postgres-spreadsheet-target-repository.js";
import { PostgresTariffRepository } from "#infrastructure/persistence/postgres/repositories/postgres-tariff-repository.js";
import { InMemorySyncMonitor } from "#infrastructure/runtime/in-memory-sync-monitor.js";
import { HourlySyncScheduler } from "#infrastructure/scheduling/hourly-sync-scheduler.js";
import { logger } from "#utils/logger.js";

await migrate.latest();
const syncMonitor = new InMemorySyncMonitor();

syncMonitor.setConfiguration({
    appPort: env.APP_PORT,
    googleSheetName: env.GOOGLE_SHEET_NAME,
    spreadsheetTargets: env.GOOGLE_SPREADSHEET_IDS.length,
    timeZone: env.APP_TIMEZONE,
    wbApiUrl: env.WB_API_URL,
});

createHealthServer({
    host: env.HTTP_HOST,
    monitor: syncMonitor,
    port: env.APP_PORT,
});
const tariffRepository = new PostgresTariffRepository(knex);
const spreadsheetTargetRepository = new PostgresSpreadsheetTargetRepository(knex);
const tariffSource = new WbBoxTariffsHttpSource({
    apiUrl: env.WB_API_URL,
    requestTimeoutMs: env.WB_API_REQUEST_TIMEOUT_MS,
    token: env.WB_API_TOKEN,
});
const spreadsheetPublisher = new GoogleSheetsPublisher({
    credentialsBase64: env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64,
});
const syncDailyWbTariffsUseCase = new SyncDailyWbTariffsUseCase({
    monitor: syncMonitor,
    tariffRepository,
    tariffSource,
});
const syncCurrentTariffsToSpreadsheetsUseCase = new SyncCurrentTariffsToSpreadsheetsUseCase({
    monitor: syncMonitor,
    sortByCoefficient: env.SORT_BY_COEFFICIENT,
    spreadsheetPublisher,
    spreadsheetTargetRepository,
    tariffRepository,
});
const runTariffSyncCycleUseCase = new RunTariffSyncCycleUseCase({
    configuredSpreadsheetIds: env.GOOGLE_SPREADSHEET_IDS,
    defaultSheetName: env.GOOGLE_SHEET_NAME,
    spreadsheetTargetRepository,
    syncCurrentTariffsToSpreadsheetsUseCase,
    syncDailyWbTariffsUseCase,
});
const scheduler = new HourlySyncScheduler({
    fetchIntervalMinutes: env.FETCH_INTERVAL_MINUTES,
    monitor: syncMonitor,
    runTariffSyncCycleUseCase,
    timeZone: env.APP_TIMEZONE,
});
await scheduler.runNow("startup");
syncMonitor.setNextRunAt(scheduler.getNextRunAt());
scheduler.start();

/**
 * Останавливает приложение.
 *
 * @param signal Сигнал процесса.
 */
const shutdown = async (signal: NodeJS.Signals) => {
    logger.warn("app", `Received ${signal}. Exiting.`);
    await scheduler.stop();
    await knex.destroy();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
