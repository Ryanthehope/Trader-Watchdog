import type { Prisma } from "@prisma/client";

export const VETTING_SECTION_IDS = [
  "address",
  "insurance",
  "tradeCredentials",
  "digitalFootprint",
  "publicRecords",
  "applicationDocuments",
] as const;

export type VettingSectionId = (typeof VETTING_SECTION_IDS)[number];

export type VettingSectionState = { done: boolean; notes: string };

export function defaultVettingState(): Record<VettingSectionId, VettingSectionState> {
  const o = {} as Record<VettingSectionId, VettingSectionState>;
  for (const id of VETTING_SECTION_IDS) {
    o[id] = { done: false, notes: "" };
  }
  return o;
}

export function mergeVettingStateFromInput(
  raw: unknown
): Record<VettingSectionId, VettingSectionState> {
  const base = defaultVettingState();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const id of VETTING_SECTION_IDS) {
    const v = obj[id];
    if (v && typeof v === "object" && v !== null) {
      const row = v as Record<string, unknown>;
      base[id] = {
        done: Boolean(row.done),
        notes: String(row.notes ?? "").slice(0, 4000),
      };
    }
  }
  return base;
}

export function mergeVettingStateFromDb(raw: unknown): Record<
  VettingSectionId,
  VettingSectionState
> {
  return mergeVettingStateFromInput(raw);
}

export function vettingStateToPrismaJson(
  state: Record<VettingSectionId, VettingSectionState>
): Prisma.InputJsonValue {
  return state as unknown as Prisma.InputJsonValue;
}

export function allVettingSectionsDone(
  state: Record<VettingSectionId, VettingSectionState>
): boolean {
  return VETTING_SECTION_IDS.every((id) => state[id]?.done === true);
}
