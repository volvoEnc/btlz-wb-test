import assert from "node:assert/strict";
import test from "node:test";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHealthRequestHandler } from "./health-server.js";
import { InMemorySyncMonitor } from "../runtime/in-memory-sync-monitor.js";

test("createHealthRequestHandler exposes runtime state on /health", () => {
    const monitor = new InMemorySyncMonitor();
    monitor.setConfiguration({
        appPort: 0,
        googleSheetName: "stocks_coefs",
        spreadsheetTargets: 2,
    });

    const handler = createHealthRequestHandler(monitor);
    const response = {
        body: "",
        headers: null as Record<string, string> | null,
        statusCode: null as number | null,
        end(payload: string) {
            this.body = payload;
        },
        writeHead(statusCode: number, headers: Record<string, string>) {
            this.statusCode = statusCode;
            this.headers = headers;
        },
    };

    handler(
        { url: "/health" } as IncomingMessage,
        response as unknown as ServerResponse<IncomingMessage>,
    );

    const body = JSON.parse(response.body) as {
        configuration: { googleSheetName: string; spreadsheetTargets: number };
        service: string;
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body.service, "wb-tariffs-sync");
    assert.equal(body.configuration.googleSheetName, "stocks_coefs");
    assert.equal(body.configuration.spreadsheetTargets, 2);
});
