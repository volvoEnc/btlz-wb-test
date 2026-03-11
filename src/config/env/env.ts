import dotenv from "dotenv";
import { tariffCoefficientFields } from "#domain/tariffs/value-objects/tariff-coefficient-field.js";
import { z } from "zod";

dotenv.config();

/**
 * Преобразует пустые строки из окружения в `undefined`.
 *
 * @param value Сырое значение переменной окружения.
 */
const emptyStringToUndefined = (value: unknown) => {
    if (typeof value !== "string") {
        return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? undefined : trimmedValue;
};

/**
 * Общая схема optional-строк, в которых пустое значение считается отсутствующим.
 */
const optionalNonEmptyString = z.preprocess(emptyStringToUndefined, z.string().min(1).optional());

/**
 * Схема валидации переменных окружения приложения.
 */
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    POSTGRES_HOST: optionalNonEmptyString,
    POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
    POSTGRES_DB: z.string().default("postgres"),
    POSTGRES_USER: z.string().default("postgres"),
    POSTGRES_PASSWORD: z.string().default("postgres"),
    APP_PORT: z.coerce.number().int().positive().default(3000),
    HTTP_HOST: z.string().default("0.0.0.0"),
    APP_TIMEZONE: z.string().default("Europe/Moscow"),
    FETCH_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
    WB_API_URL: z.string().url().default("https://common-api.wildberries.ru/api/v1/tariffs/box"),
    WB_API_TOKEN: optionalNonEmptyString,
    WB_API_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    GOOGLE_SPREADSHEET_IDS: optionalNonEmptyString,
    GOOGLE_SHEET_NAME: z.string().default("stocks_coefs"),
    GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64: optionalNonEmptyString,
    SORT_BY_COEFFICIENT: z.enum(tariffCoefficientFields).default("box_delivery_coef_expr"),
});

/**
 * Провалидированные переменные окружения в сыром виде.
 */
const parsedEnv = envSchema.parse(process.env);

/**
 * Нормализованная runtime-конфигурация приложения.
 */
const env = {
    ...parsedEnv,
    GOOGLE_SPREADSHEET_IDS: parsedEnv.GOOGLE_SPREADSHEET_IDS?.split(",")
        .map((spreadsheetId) => spreadsheetId.trim())
        .filter(Boolean) ?? [],
};

export default env;
