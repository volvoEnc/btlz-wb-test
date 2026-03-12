import type { TariffSpreadsheetView } from "#application/dto/tariff-spreadsheet-view.js";
import type { SpreadsheetPublisher } from "#application/ports/spreadsheet-publisher.js";
import type { SpreadsheetTarget } from "#domain/spreadsheets/entities/spreadsheet-target.js";
import { google, sheets_v4 } from "googleapis";

/**
 * Данные сервисного аккаунта.
 */
interface GoogleSheetsCredentials {
    client_email: string;
    private_key: string;
}

/**
 * Конфиг Google Sheets.
 */
interface GoogleSheetsPublisherConfig {
    /** Base64 JSON с ключом. */
    credentialsBase64?: string;
    /** Клиент для тестов. */
    sheetsClient?: sheets_v4.Sheets | null;
}

/**
 * Заголовок `stocks_coefs`.
 */
const headerRow = [
    "Дата тарифа",
    "Дата следующего изменения",
    "Дата максимального тарифа",
    "Склад",
    "География",
    "Коэффициент доставки",
    "База доставки",
    "Литр доставки",
    "Коэффициент доставки маркетплейса",
    "База доставки маркетплейса",
    "Литр доставки маркетплейса",
    "Коэффициент хранения",
    "База хранения",
    "Литр хранения",
    "Обновлено в БД",
];

/**
 * Читает credentials.
 *
 * @param credentialsBase64 Base64 JSON.
 */
function parseCredentials(credentialsBase64?: string): GoogleSheetsCredentials | null {
    if (!credentialsBase64) {
        return null;
    }

    const rawJson = Buffer.from(credentialsBase64, "base64").toString("utf-8");
    const parsedCredentials = JSON.parse(rawJson) as Partial<GoogleSheetsCredentials>;

    if (!parsedCredentials.client_email || !parsedCredentials.private_key) {
        throw new Error("Google service account credentials must contain client_email and private_key");
    }

    return {
        client_email: parsedCredentials.client_email,
        private_key: parsedCredentials.private_key,
    };
}

/**
 * Создаёт клиент Sheets.
 *
 * @param credentialsBase64 Base64 JSON.
 */
function createSheetsClient(credentialsBase64?: string): sheets_v4.Sheets | null {
    const credentials = parseCredentials(credentialsBase64);

    if (!credentials) {
        return null;
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return google.sheets({
        auth,
        version: "v4",
    });
}

/**
 * Создаёт лист, если его нет.
 *
 * @param client Клиент.
 * @param spreadsheetId ID таблицы.
 * @param sheetName Имя листа.
 */
async function ensureSheetExists(client: sheets_v4.Sheets, spreadsheetId: string, sheetName: string): Promise<void> {
    const spreadsheet = await client.spreadsheets.get({
        fields: "sheets.properties.title",
        spreadsheetId,
    });

    const hasSheet = spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === sheetName);

    if (hasSheet) {
        return;
    }

    await client.spreadsheets.batchUpdate({
        requestBody: {
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: sheetName,
                        },
                    },
                },
            ],
        },
        spreadsheetId,
    });
}

/**
 * Пишет тарифы в Google Sheets.
 */
export class GoogleSheetsPublisher implements SpreadsheetPublisher {
    private readonly client: sheets_v4.Sheets | null;

    /**
     * @param config Конфиг.
     */
    public constructor(private readonly config: GoogleSheetsPublisherConfig) {
        this.client = this.config.sheetsClient ?? createSheetsClient(this.config.credentialsBase64);
    }

    /**
     * @inheritdoc
     */
    public isConfigured(): boolean {
        return this.client !== null;
    }

    /**
     * @inheritdoc
     */
    public async publishTariffs(target: SpreadsheetTarget, view: TariffSpreadsheetView): Promise<void> {
        if (!this.client) {
            throw new Error("Google credentials are not configured");
        }

        await ensureSheetExists(this.client, target.spreadsheetId, target.sheetName);

        await this.client.spreadsheets.values.clear({
            range: `${target.sheetName}!A:O`,
            spreadsheetId: target.spreadsheetId,
        });

        await this.client.spreadsheets.values.update({
            range: `${target.sheetName}!A1`,
            requestBody: {
                values: [
                    headerRow,
                    ...view.rows.map((row) => [
                        row.tariffDate,
                        row.dtNextBox ?? "",
                        row.dtTillMax ?? "",
                        row.warehouseName,
                        row.geoName,
                        row.boxDeliveryCoefExpr ?? "",
                        row.boxDeliveryBase ?? "",
                        row.boxDeliveryLiter ?? "",
                        row.boxDeliveryMarketplaceCoefExpr ?? "",
                        row.boxDeliveryMarketplaceBase ?? "",
                        row.boxDeliveryMarketplaceLiter ?? "",
                        row.boxStorageCoefExpr ?? "",
                        row.boxStorageBase ?? "",
                        row.boxStorageLiter ?? "",
                        row.updatedAt,
                    ]),
                ],
            },
            spreadsheetId: target.spreadsheetId,
            valueInputOption: "USER_ENTERED",
        });
    }
}
