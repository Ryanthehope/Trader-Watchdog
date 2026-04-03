export const VETTING_SECTION_IDS = [
    "address",
    "insurance",
    "tradeCredentials",
    "digitalFootprint",
    "publicRecords",
    "applicationDocuments",
];
export function defaultVettingState() {
    const o = {};
    for (const id of VETTING_SECTION_IDS) {
        o[id] = { done: false, notes: "" };
    }
    return o;
}
export function mergeVettingStateFromInput(raw) {
    const base = defaultVettingState();
    if (!raw || typeof raw !== "object")
        return base;
    const obj = raw;
    for (const id of VETTING_SECTION_IDS) {
        const v = obj[id];
        if (v && typeof v === "object" && v !== null) {
            const row = v;
            base[id] = {
                done: Boolean(row.done),
                notes: String(row.notes ?? "").slice(0, 4000),
            };
        }
    }
    return base;
}
export function mergeVettingStateFromDb(raw) {
    return mergeVettingStateFromInput(raw);
}
export function vettingStateToPrismaJson(state) {
    return state;
}
export function allVettingSectionsDone(state) {
    return VETTING_SECTION_IDS.every((id) => state[id]?.done === true);
}
