const LAUNCH_START = new Date("2026-06-01T00:00:00");
const PUBLIC_SEARCH_START = new Date("2026-06-08T00:00:00");
const FOUNDER_DISCOUNT_END = new Date("2026-07-01T00:00:00");

export function getLaunchWindow(now = new Date()) {
    const beforeLaunch = now < LAUNCH_START;
    const launchDiscountActive =
        now >= LAUNCH_START && now < FOUNDER_DISCOUNT_END;
    const publicSearchEnabled = now >= PUBLIC_SEARCH_START;

    return {
        beforeLaunch,
        launchDiscountActive,
        publicSearchEnabled,
    };
}