import assert from "node:assert/strict";
import test from "node:test";
import { GoogleSheetsPublisher } from "./google-sheets-publisher.js";
import { createTariffSpreadsheetViewFixture } from "../../../testing/fixtures.js";
import type { sheets_v4 } from "googleapis";

interface SheetsClientDouble {
    calls: Array<{ args: unknown; method: string }>;
    client: sheets_v4.Sheets;
}

function createSheetsClientDouble(hasSheet = true): SheetsClientDouble {
    const calls: Array<{ args: unknown; method: string }> = [];

    return {
        calls,
        client: {
            spreadsheets: {
                batchUpdate: async (args: unknown) => {
                    calls.push({ args, method: "batchUpdate" });
                    return {};
                },
                get: async (args: unknown) => {
                    calls.push({ args, method: "get" });
                    return {
                        data: {
                            sheets: hasSheet
                                ? [
                                      {
                                          properties: {
                                              title: "stocks_coefs",
                                          },
                                      },
                                  ]
                                : [],
                        },
                    };
                },
                values: {
                    clear: async (args: unknown) => {
                        calls.push({ args, method: "clear" });
                        return {};
                    },
                    update: async (args: unknown) => {
                        calls.push({ args, method: "update" });
                        return {};
                    },
                },
            },
        } as unknown as sheets_v4.Sheets,
    };
}

test("GoogleSheetsPublisher reports not configured without credentials or injected client", () => {
    const publisher = new GoogleSheetsPublisher({});

    assert.equal(publisher.isConfigured(), false);
});

test("GoogleSheetsPublisher updates an existing sheet with tariff rows", async () => {
    const { calls, client } = createSheetsClientDouble(true);
    const publisher = new GoogleSheetsPublisher({ sheetsClient: client });

    await publisher.publishTariffs(
        {
            sheetName: "stocks_coefs",
            spreadsheetId: "spreadsheet-1",
        },
        createTariffSpreadsheetViewFixture(),
    );

    assert.equal(publisher.isConfigured(), true);
    assert.equal(calls.some((call) => call.method === "batchUpdate"), false);
    assert.equal(calls.some((call) => call.method === "clear"), true);
    assert.equal(calls.some((call) => call.method === "update"), true);

    const updateCall = calls.find((call) => call.method === "update");
    assert.equal((updateCall?.args as { requestBody: { values: unknown[][] } }).requestBody.values.length, 2);
    assert.equal((updateCall?.args as { requestBody: { values: string[][] } }).requestBody.values[1][3], "Коледино");
});

test("GoogleSheetsPublisher creates the sheet when it is absent", async () => {
    const { calls, client } = createSheetsClientDouble(false);
    const publisher = new GoogleSheetsPublisher({ sheetsClient: client });

    await publisher.publishTariffs(
        {
            sheetName: "stocks_coefs",
            spreadsheetId: "spreadsheet-1",
        },
        createTariffSpreadsheetViewFixture(),
    );

    assert.equal(calls.some((call) => call.method === "batchUpdate"), true);
});
