import { InMemorySyncMonitor } from "#infrastructure/runtime/in-memory-sync-monitor.js";
import { logger } from "#utils/logger.js";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

/**
 * Конфиг health-сервера.
 */
interface HealthServerConfig {
    /** Host. */
    host: string;
    /** Монитор. */
    monitor: InMemorySyncMonitor;
    /** Порт. */
    port: number;
}

/**
 * Делает handler для `/health`.
 *
 * @param monitor Монитор.
 */
export function createHealthRequestHandler(
    monitor: InMemorySyncMonitor,
): (request: IncomingMessage, response: ServerResponse) => void {
    /**
     * Обрабатывает запрос.
     *
     * @param request Запрос.
     * @param response Ответ.
     */
    return (request: IncomingMessage, response: ServerResponse): void => {
        if (request.url !== "/health") {
            response.writeHead(404, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: "Not found" }));
            return;
        }

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
            JSON.stringify({
                service: "wb-tariffs-sync",
                status: "ok",
                ...monitor.getState(),
            }),
        );
    };
}

/**
 * Поднимает `/health`.
 *
 * @param config Конфиг.
 */
export function createHealthServer(config: HealthServerConfig): Server {
    const server = createServer(createHealthRequestHandler(config.monitor));

    server.listen(config.port, config.host, () => {
        logger.info("health", `Health endpoint is available on http://${config.host}:${config.port}/health`);
    });

    return server;
}
