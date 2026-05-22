type ApplicationPublicProfileSource = {
  company: string;
  trade: string;
  phone: string | null;
  postcode: string;
  wasteCarrierRequired: string | null;
  wasteCarrierNumber: string | null;
  gasSafeRequired: string | null;
  gasSafeNumber: string | null;
  icoNumber: string | null;
  businessDescription: string | null;
};

function normalizeRequirement(value: string | null | undefined): "yes" | "no" | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "yes") return "yes";
  if (normalized === "no") return "no";
  return null;
}

export function buildMemberBlurbFromApplication(
  app: ApplicationPublicProfileSource
): string {
  return (
    app.businessDescription?.trim() ||
    `${app.company} is a Trader Watchdog checked ${app.trade} business. This profile was published after staff vetting of the membership application.`
  );
}

export function buildMemberVettingItemsFromApplication(
  app: ApplicationPublicProfileSource
) {
  const wasteCarrierRequired = normalizeRequirement(app.wasteCarrierRequired);
  const gasSafeRequired = normalizeRequirement(app.gasSafeRequired);

  return [
    {
      id: "business",
      label: "Business checks",
      items: [
        {
          id: "trading-name",
          label: "Trading name verified",
          status: "verified",
          value: app.company.trim() || "Verified on application",
        },
        {
          id: "contact-number",
          label: "Contact number checked",
          status: "verified",
          value: app.phone?.trim() || "Verified during application review",
        },
        {
          id: "trading-area",
          label: "Trading area confirmed",
          status: "verified",
          value: app.postcode.trim() ? `${app.postcode.trim()} area` : "Verified on application",
        },
      ],
    },
    {
      id: "compliance",
      label: "Compliance and registrations",
      items: [
        {
          id: "insurance",
          label: "Insurance evidence reviewed",
          status: "verified",
          detail:
            "Insurance documents were reviewed before this Trader Watchdog profile was approved.",
        },
        {
          id: "waste-carrier",
          label: "Waste carrier licence",
          status: "verified",
          detail:
            wasteCarrierRequired === "yes"
              ? "Required for this trade and checked against the application."
              : wasteCarrierRequired === "no"
                ? "Not required for this trader based on the work declared in the application."
                : "No requirement recorded on the application.",
          value:
            wasteCarrierRequired === "yes"
              ? app.wasteCarrierNumber?.trim() || "Verified"
              : "N/A",
        },
        {
          id: "gas-safe",
          label: "Gas Safe registration",
          status: "verified",
          detail:
            gasSafeRequired === "yes"
              ? "Required for this trade and checked against the application."
              : gasSafeRequired === "no"
                ? "Not required for this trader based on the work declared in the application."
                : "No requirement recorded on the application.",
          value:
            gasSafeRequired === "yes"
              ? app.gasSafeNumber?.trim() || "Verified"
              : "N/A",
        },
        {
          id: "ico",
          label: "ICO registration",
          status: "verified",
          detail: app.icoNumber?.trim()
            ? "The trader supplied an ICO registration reference on the application."
            : "No ICO registration was recorded on the application.",
          value: app.icoNumber?.trim() || "N/A",
        },
      ],
    },
  ];
}