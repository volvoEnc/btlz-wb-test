import dotenv from "dotenv";
import { tariffCoefficientFields } from "#domain/tariffs/value-objects/tariff-coefficient-field.js";
import { isSupportedTimeZone } from "#utils/date.js";
import { z } from "zod";

dotenv.config();

/**
 * Пустую строку из env превращает в `undefined`.
 *
 * @param value Значение из env.
 */
const emptyStringToUndefined = (value: unknown) => {
    if (typeof value !== "string") {
        return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? undefined : trimmedValue;
};

/**
 * Optional-строка без пустых значений.
 */
const optionalNonEmptyString = z.preprocess(emptyStringToUndefined, z.string().min(1).optional());

/**
 * Валидная IANA-таймзона.
 */
const timeZoneSchema = z.string().refine(isSupportedTimeZone, {
    message: "APP_TIMEZONE must be a valid IANA time zone, for example Europe/Moscow or Asia/Yekaterinburg",
});

/**
 * Схема env.
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
    APP_TIMEZONE: timeZoneSchema.default("Europe/Moscow"),
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
 * Провалидированный env.
 */
const parsedEnv = envSchema.parse(process.env);

/**
 * Env для приложения.
 */
const env = {
    ...parsedEnv,
    GOOGLE_SPREADSHEET_IDS: parsedEnv.GOOGLE_SPREADSHEET_IDS?.split(",")
        .map((spreadsheetId) => spreadsheetId.trim())
        .filter(Boolean) ?? [],
};

export default env;
