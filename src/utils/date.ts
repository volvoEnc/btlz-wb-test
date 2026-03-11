/**
 * Форматирует дату в `YYYY-MM-DD` в указанной таймзоне.
 *
 * @param date Исходная дата.
 * @param timeZone IANA-таймзона.
 */
export function formatDateInTimeZone(date: Date, timeZone: string): string {
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
 * Вычисляет ближайшую следующую границу часа.
 *
 * @param date Базовая дата расчёта.
 */
export function getNextHourBoundary(date: Date): Date {
    const nextDate = new Date(date);
    nextDate.setMinutes(0, 0, 0);
    nextDate.setHours(nextDate.getHours() + 1);
    return nextDate;
}
