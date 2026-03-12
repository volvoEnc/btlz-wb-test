/**
 * Payload для логгера.
 */
type LogPayload = Record<string, unknown> | string | null | undefined;

/**
 * Собирает хвост лога.
 *
 * @param payload Данные.
 */
const serializePayload = (payload: LogPayload) => {
    if (payload === null || payload === undefined) {
        return "";
    }

    if (typeof payload === "string") {
        return ` ${payload}`;
    }

    return ` ${JSON.stringify(payload)}`;
};

/**
 * Печатает строку лога.
 *
 * @param method Метод консоли.
 * @param scope Scope сообщения.
 * @param message Текст.
 * @param payload Данные.
 */
const print = (method: "error" | "info" | "warn", scope: string, message: string, payload?: LogPayload) => {
    const formattedMessage = `[${new Date().toISOString()}] [${scope}] ${message}${serializePayload(payload)}`;
    console[method](formattedMessage);
};

/**
 * Простой логгер.
 */
export const logger = {
    /**
     * Пишет `error`.
     */
    error(scope: string, message: string, payload?: LogPayload) {
        print("error", scope, message, payload);
    },
    /**
     * Пишет `info`.
     */
    info(scope: string, message: string, payload?: LogPayload) {
        print("info", scope, message, payload);
    },
    /**
     * Пишет `warn`.
     */
    warn(scope: string, message: string, payload?: LogPayload) {
        print("warn", scope, message, payload);
    },
};
