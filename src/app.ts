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

/**
 * Применяет миграции перед стартом приложения.
 */
await migrate.latest();

/**
 * In-memory монитор runtime-состояния для `/health`.
 */
const syncMonitor = new InMemorySyncMonitor();

syncMonitor.setConfiguration({
    appPort: env.APP_PORT,
    googleSheetName: env.GOOGLE_SHEET_NAME,
    spreadsheetTargets: env.GOOGLE_SPREADSHEET_IDS.length,
    timeZone: env.APP_TIMEZONE,
    wbApiUrl: env.WB_API_URL,
});

/**
 * Поднимает HTTP health endpoint.
 */
createHealthServer({
    host: env.HTTP_HOST,
    monitor: syncMonitor,
    port: env.APP_PORT,
});

/**
 * Инфраструктурные адаптеры persistence.
 */
const tariffRepository = new PostgresTariffRepository(knex);
const spreadsheetTargetRepository = new PostgresSpreadsheetTargetRepository(knex);

/**
 * Интеграция с Wildberries API.
 */
const tariffSource = new WbBoxTariffsHttpSource({
    apiUrl: env.WB_API_URL,
    requestTimeoutMs: env.WB_API_REQUEST_TIMEOUT_MS,
    token: env.WB_API_TOKEN,
});

/**
 * Интеграция с Google Sheets API.
 */
const spreadsheetPublisher = new GoogleSheetsPublisher({
    credentialsBase64: env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64,
});

/**
 * Application use case загрузки тарифов WB.
 */
const syncDailyWbTariffsUseCase = new SyncDailyWbTariffsUseCase({
    monitor: syncMonitor,
    tariffRepository,
    tariffSource,
});

/**
 * Application use case публикации тарифов в Google Sheets.
 */
const syncCurrentTariffsToSpreadsheetsUseCase = new SyncCurrentTariffsToSpreadsheetsUseCase({
    monitor: syncMonitor,
    sortByCoefficient: env.SORT_BY_COEFFICIENT,
    spreadsheetPublisher,
    spreadsheetTargetRepository,
    tariffRepository,
});

/**
 * Оркестратор полного цикла синхронизации.
 */
const runTariffSyncCycleUseCase = new RunTariffSyncCycleUseCase({
    configuredSpreadsheetIds: env.GOOGLE_SPREADSHEET_IDS,
    defaultSheetName: env.GOOGLE_SHEET_NAME,
    spreadsheetTargetRepository,
    syncCurrentTariffsToSpreadsheetsUseCase,
    syncDailyWbTariffsUseCase,
});

/**
 * Планировщик почасовой синхронизации.
 */
const scheduler = new HourlySyncScheduler({
    fetchIntervalMinutes: env.FETCH_INTERVAL_MINUTES,
    monitor: syncMonitor,
    runTariffSyncCycleUseCase,
    timeZone: env.APP_TIMEZONE,
});

/**
 * Выполняет стартовый цикл и включает почасовое расписание.
 */
await scheduler.runNow("startup");
syncMonitor.setNextRunAt(scheduler.getNextRunAt());
scheduler.start();

/**
 * Корректно останавливает приложение и освобождает ресурсы.
 *
 * @param signal Полученный системный сигнал.
 */
const shutdown = async (signal: NodeJS.Signals) => {
    logger.warn("app", `Received ${signal}. Exiting.`);
    await scheduler.stop();
    await knex.destroy();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
