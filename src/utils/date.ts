/**
 * Проверяет таймзону.
 *
 * @param timeZone Имя таймзоны.
 */
export function isSupportedTimeZone(timeZone: string): boolean {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone });
        return true;
    } catch {
        return false;
    }
}

/**
 * Форматирует дату в `YYYY-MM-DD`.
 *
 * @param date Дата.
 * @param timeZone Таймзона.
 */
export function formatDateInTimeZone(date: Date, timeZone: string): string {
    if (!isSupportedTimeZone(timeZone)) {
        throw new RangeError(`Unsupported time zone: ${timeZone}`);
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        timeZone,
        year: "numeric",
    });

    const parts = formatter.formatToParts(date);
    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

/**
 * Даёт начало следующего часа.
 *
 * @param date Базовая дата.
 */
export function getNextHourBoundary(date: Date): Date {
    const nextDate = new Date(date);
    nextDate.setMinutes(0, 0, 0);
    nextDate.setHours(nextDate.getHours() + 1);
    return nextDate;
}
