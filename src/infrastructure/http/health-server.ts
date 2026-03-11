import { InMemorySyncMonitor } from "#infrastructure/runtime/in-memory-sync-monitor.js";
import { logger } from "#utils/logger.js";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

/**
 * Конфигурация HTTP-сервера health endpoint.
 */
interface HealthServerConfig {
    /** HTTP-host для прослушивания. */
    host: string;
    /** Монитор runtime-состояния приложения. */
    monitor: InMemorySyncMonitor;
    /** HTTP-порт для health endpoint. */
    port: number;
}

/**
 * Создаёт request handler для health endpoint.
 *
 * @param monitor Монитор runtime-состояния приложения.
 */
export function createHealthRequestHandler(
    monitor: InMemorySyncMonitor,
): (request: IncomingMessage, response: ServerResponse) => void {
    /**
     * Обрабатывает входящие запросы health endpoint.
     *
     * @param request Входящий HTTP-запрос.
     * @param response HTTP-ответ.
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
 * Поднимает HTTP endpoint `/health` с runtime-состоянием приложения.
 *
 * @param config Конфигурация health-сервера.
 */
export function createHealthServer(config: HealthServerConfig): Server {
    const server = createServer(createHealthRequestHandler(config.monitor));

    server.listen(config.port, config.host, () => {
        logger.info("health", `Health endpoint is available on http://${config.host}:${config.port}/health`);
    });

    return server;
}
