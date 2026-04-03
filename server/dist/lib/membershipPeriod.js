/**
 * End of the same calendar day one month after `from` (UTC), clamping the day
 * when the target month is shorter (e.g. Jan 31 → Feb 28/29).
 */
export function addOneCalendarMonthEndUtc(from) {
    const y = from.getUTCFullYear();
    const m = from.getUTCMonth();
    const day = from.getUTCDate();
    const nextMonthStart = new Date(Date.UTC(y, m + 1, 1));
    const y2 = nextMonthStart.getUTCFullYear();
    const m2 = nextMonthStart.getUTCMonth();
    const lastDay = new Date(Date.UTC(y2, m2 + 1, 0)).getUTCDate();
    const d = Math.min(day, lastDay);
    return new Date(Date.UTC(y2, m2, d, 23, 59, 59, 999));
}
