import assert from "node:assert/strict";
import test from "node:test";
import { WbBoxTariffsHttpSource } from "./wb-box-tariffs-http-source.js";

test("WbBoxTariffsHttpSource reports configuration state from token", () => {
    const configuredSource = new WbBoxTariffsHttpSource({
        apiUrl: "https://common-api.wildberries.ru/api/v1/tariffs/box",
        requestTimeoutMs: 1000,
        token: "secret",
    });
    const unconfiguredSource = new WbBoxTariffsHttpSource({
        apiUrl: "https://common-api.wildberries.ru/api/v1/tariffs/box",
        requestTimeoutMs: 1000,
    });

    assert.equal(configuredSource.isConfigured(), true);
    assert.equal(unconfiguredSource.isConfigured(), false);
});

test("WbBoxTariffsHttpSource fetches and maps WB response", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<[URL, RequestInit | undefined]> = [];

    globalThis.fetch = async (url, options) => {
        requests.push([url as URL, options]);

        return new Response(
            JSON.stringify({
                response: {
                    data: {
                        dtNextBox: "2026-03-12",
                        dtTillMax: "2026-03-31",
                        warehouseList: [
                            {
                                boxDeliveryBase: "12,5",
                                boxDeliveryCoefExpr: "1,2",
                                boxDeliveryLiter: "3,1",
                                boxDeliveryMarketplaceBase: "14,2",
                                boxDeliveryMarketplaceCoefExpr: "1,4",
                                boxDeliveryMarketplaceLiter: "3,7",
                                boxStorageBase: "4,8",
                                boxStorageCoefExpr: "0,9",
                                boxStorageLiter: "1,1",
                                geoName: "Москва",
                                warehouseName: "Коледино",
                            },
                        ],
                    },
                },
            }),
            { status: 200 },
        );
    };

    try {
        const source = new WbBoxTariffsHttpSource({
            apiUrl: "https://common-api.wildberries.ru/api/v1/tariffs/box",
            requestTimeoutMs: 1000,
            token: "secret",
        });

        const snapshot = await source.fetchDailyTariffs("2026-03-11");

        assert.equal(requests.length, 1);
        assert.equal(requests[0][0].searchParams.get("date"), "2026-03-11");
        assert.equal((requests[0][1]?.headers as Record<string, string>).Authorization, "secret");
        assert.equal(snapshot.warehouses[0].boxDeliveryBase, 12.5);
        assert.equal(snapshot.warehouses[0].boxStorageCoefExpr, 0.9);
        assert.equal(snapshot.tariffDate, "2026-03-11");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("WbBoxTariffsHttpSource throws on non-success HTTP status", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => new Response("unauthorized", { status: 401 });

    try {
        const source = new WbBoxTariffsHttpSource({
            apiUrl: "https://common-api.wildberries.ru/api/v1/tariffs/box",
            requestTimeoutMs: 1000,
            token: "secret",
        });

        await assert.rejects(() => source.fetchDailyTariffs("2026-03-11"), /WB API returned 401: unauthorized/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("WbBoxTariffsHttpSource maps empty WB dates to null", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                response: {
                    data: {
                        dtNextBox: "",
                        dtTillMax: "   ",
                        warehouseList: [],
                    },
                },
            }),
            { status: 200 },
        );

    try {
        const source = new WbBoxTariffsHttpSource({
            apiUrl: "https://common-api.wildberries.ru/api/v1/tariffs/box",
            requestTimeoutMs: 1000,
            token: "secret",
        });

        const snapshot = await source.fetchDailyTariffs("2026-03-11");

        assert.equal(snapshot.dtNextBox, null);
        assert.equal(snapshot.dtTillMax, null);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
