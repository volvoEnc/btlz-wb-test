/**
 * Допустимые типы payload для логгера.
 */
type LogPayload = Record<string, unknown> | string | null | undefined;

/**
 * Приводит payload к строке для вывода в лог.
 *
 * @param payload Дополнительные данные лога.
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
 * Печатает строку лога в нужный поток консоли.
 *
 * @param method Метод консоли.
 * @param scope Логический scope сообщения.
 * @param message Основной текст сообщения.
 * @param payload Дополнительные данные.
 */
const print = (method: "error" | "info" | "warn", scope: string, message: string, payload?: LogPayload) => {
    const formattedMessage = `[${new Date().toISOString()}] [${scope}] ${message}${serializePayload(payload)}`;
    console[method](formattedMessage);
};

/**
 * Минимальный структурированный логгер приложения.
 */
export const logger = {
    /**
     * Пишет сообщение уровня error.
     */
    error(scope: string, message: string, payload?: LogPayload) {
        print("error", scope, message, payload);
    },
    /**
     * Пишет сообщение уровня info.
     */
    info(scope: string, message: string, payload?: LogPayload) {
        print("info", scope, message, payload);
    },
    /**
     * Пишет сообщение уровня warn.
     */
    warn(scope: string, message: string, payload?: LogPayload) {
        print("warn", scope, message, payload);
    },
};
