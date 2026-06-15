const LAUNCH_START = new Date("2026-06-01T00:00:00");
const APPLICATIONS_OPEN = new Date("2026-06-17T00:00:00");
const PUBLIC_SEARCH_START = new Date("2026-07-01T00:00:00");

export function getLaunchWindow(now = new Date()) {
  const beforeLaunch = now < LAUNCH_START;
  const applicationsOpen = now >= APPLICATIONS_OPEN;
  const publicSearchEnabled = now >= PUBLIC_SEARCH_START;

  return {
    beforeLaunch,
    applicationsOpen,
    publicSearchEnabled,
  };
}