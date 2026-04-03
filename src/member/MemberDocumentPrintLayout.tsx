import type { CSSProperties, ReactNode } from "react";
import { publicApiUrl } from "../lib/api";
import { formatGBPFromCents } from "../lib/formatGBP";

export type DocumentIssuer = {
  businessName: string;
  trade: string;
  slug: string;
  tvId: string;
  hasLogo: boolean;
  address: string | null;
  phone: string | null;
  email: string | null;
  vatNumber: string | null;
  /** When false, VAT number is hidden on customer documents. */
  vatRegistered?: boolean;
  /** From Business details — shown on invoices for bank transfer. */
  bankDetails?: string | null;
  accentHex: string;
  /** standard = minimal border accent; bold = tinted header + stronger table */
  layout?: "standard" | "bold";
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function accentTint(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(13, 148, 136, ${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

type LineRow = {
  description?: string;
  quantity?: number;
  unitPence?: number;
  lineTotalPence?: number;
};

type Props = {
  kind: "quote" | "invoice";
  issuer: DocumentIssuer;
  reference: string;
  title?: string;
  /** Customer / bill-to */
  customerName: string;
  customerAddress?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  lineItems: unknown;
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
  notes: string | null;
  createdAt: string;
  dueDate?: string | null;
  paidAt?: string | null;
  status?: string;
  /** Shown on invoices (e.g. bank transfer). */
  paymentMethod?: string | null;
  children?: ReactNode;
};

function AddressBlock({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
      {text.trim()}
    </p>
  );
}

export function MemberDocumentPrintLayout({
  kind,
  issuer,
  reference,
  title,
  customerName,
  customerAddress,
  customerEmail,
  customerPhone,
  lineItems,
  subtotalPence,
  vatPence,
  totalPence,
  notes,
  createdAt,
  dueDate,
  paidAt,
  status,
  paymentMethod,
  children,
}: Props) {
  const accent = issuer.accentHex || "#0d9488";
  const layout = issuer.layout === "bold" ? "bold" : "standard";
  const lines = Array.isArray(lineItems) ? (lineItems as LineRow[]) : [];
  const label = kind === "quote" ? "Quote" : "Invoice";

  const logoSrc = issuer.hasLogo
    ? publicApiUrl(
        `/api/members/by-slug/${encodeURIComponent(issuer.slug)}/profile-logo`
      )
    : null;

  return (
    <div
      className="document-print-root min-h-screen bg-slate-50 text-slate-900 print:bg-white"
      style={
        {
          "--doc-accent": accent,
        } as CSSProperties
      }
    >
      <div className="mx-auto max-w-[210mm] px-4 py-6 print:max-w-none print:px-[12mm] print:py-[10mm] sm:px-8">
        {/* Screen-only: print hygiene */}
        <div className="mb-6 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 print:hidden">
          <p className="font-medium">Save as PDF</p>
          <p className="mt-1 text-amber-900/90">
            In the print dialog, turn{" "}
            <strong className="font-semibold">headers and footers off</strong>{" "}
            so the browser does not add the page URL or date along the edges.
          </p>
        </div>

        <article className="overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none sm:rounded-xl">
          <header
            className={`px-6 pb-6 pt-6 sm:px-10 sm:pt-8 ${
              layout === "bold" ? "border-b-0" : "border-b-4"
            }`}
            style={{
              borderColor: layout === "bold" ? undefined : accent,
              background:
                layout === "bold"
                  ? `linear-gradient(165deg, ${accentTint(accent, 0.2)} 0%, ${accentTint(accent, 0.06)} 42%, #ffffff 100%)`
                  : undefined,
              borderBottom:
                layout === "bold" ? `4px solid ${accent}` : undefined,
            }}
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-bold uppercase tracking-[0.2em] ${
                    layout === "bold" ? "drop-shadow-sm" : ""
                  }`}
                  style={{ color: accent }}
                >
                  {label}
                </p>
                <h1
                  className={`font-display mt-1 tracking-tight text-slate-900 ${
                    layout === "bold"
                      ? "text-4xl font-bold"
                      : "text-3xl font-bold"
                  }`}
                >
                  {issuer.businessName}
                </h1>
                <p className="mt-0.5 text-sm text-slate-600">{issuer.trade}</p>
                <div className="mt-4 space-y-1 text-sm text-slate-700">
                  <AddressBlock text={issuer.address} />
                  {issuer.phone ? (
                    <p>
                      <span className="text-slate-500">Tel </span>
                      {issuer.phone}
                    </p>
                  ) : null}
                  {issuer.email ? (
                    <p className="break-all">
                      <span className="text-slate-500">Email </span>
                      {issuer.email}
                    </p>
                  ) : null}
                  {issuer.vatNumber &&
                  (issuer.vatRegistered === undefined || issuer.vatRegistered) ? (
                    <p>
                      <span className="text-slate-500">VAT </span>
                      {issuer.vatNumber}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    className="h-16 max-h-20 w-auto max-w-[200px] object-contain sm:h-20"
                  />
                ) : null}
                <div className="text-left sm:text-right">
                  <p className="font-mono text-lg font-semibold text-slate-900">
                    {reference}
                  </p>
                  <p className="text-xs text-slate-500">
                    {label} date{" "}
                    {new Date(createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {kind === "invoice" && dueDate ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Due{" "}
                      {new Date(dueDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  ) : null}
                  {kind === "invoice" && status ? (
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                      Status: {status}
                      {status === "paid" && paidAt
                        ? ` · ${new Date(paidAt).toLocaleDateString("en-GB")}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div className="px-6 py-8 sm:px-10">
            <div
              className={`grid gap-8 border-b border-slate-100 pb-8 ${title ? "sm:grid-cols-2" : ""}`}
            >
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bill to
                </h2>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {customerName}
                </p>
                {customerAddress?.trim() ? (
                  <div className="mt-1">
                    <AddressBlock text={customerAddress} />
                  </div>
                ) : null}
                {customerEmail ? (
                  <p className="mt-1 text-sm text-slate-600">{customerEmail}</p>
                ) : null}
                {customerPhone ? (
                  <p className="mt-0.5 text-sm text-slate-600">{customerPhone}</p>
                ) : null}
              </div>
              {title ? (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {kind === "quote" ? "Summary" : "Details"}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-800">
                    {title}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr
                    className={`text-left text-xs font-semibold uppercase tracking-wide ${
                      layout === "bold"
                        ? "text-white"
                        : "border-b-2 border-slate-200 text-slate-500"
                    }`}
                    style={
                      layout === "bold"
                        ? { backgroundColor: accent, color: "#fff" }
                        : undefined
                    }
                  >
                    <th className="py-3 pr-4">Description</th>
                    <th className="hidden py-3 pr-4 text-right sm:table-cell">
                      Qty
                    </th>
                    <th className="hidden py-3 pr-4 text-right md:table-cell">
                      Unit
                    </th>
                    <th className="py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((row, i) => {
                    const qty = Math.max(1, Number(row.quantity) || 1);
                    let unit = Number(row.unitPence);
                    if (!Number.isFinite(unit) || unit <= 0) {
                      unit = Math.round(Number(row.lineTotalPence) / qty) || 0;
                    }
                    const lineTot = Number(row.lineTotalPence) ?? 0;
                    return (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-3 pr-4 text-slate-800">
                          {row.description ?? "—"}
                        </td>
                        <td className="hidden py-3 pr-4 text-right text-slate-600 sm:table-cell">
                          {qty}
                        </td>
                        <td className="hidden py-3 pr-4 text-right text-slate-600 md:table-cell">
                          {unit > 0 ? formatGBPFromCents(unit) : "—"}
                        </td>
                        <td className="py-3 text-right font-medium tabular-nums text-slate-900">
                          {formatGBPFromCents(lineTot)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col items-end gap-2 border-t border-slate-100 pt-6">
              <div className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatGBPFromCents(subtotalPence)}
                  </span>
                </div>
                {vatPence !== 0 ? (
                  <div className="flex justify-between text-slate-600">
                    <span>VAT</span>
                    <span className="tabular-nums">
                      {formatGBPFromCents(vatPence)}
                    </span>
                  </div>
                ) : null}
                <div
                  className="flex justify-between border-t-2 pt-3 text-base font-bold text-slate-900"
                  style={{ borderColor: accent }}
                >
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatGBPFromCents(totalPence)}
                  </span>
                </div>
              </div>
            </div>

            {kind === "invoice" && paymentMethod?.trim() ? (
              <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment
                </p>
                <p className="mt-1 whitespace-pre-line">{paymentMethod.trim()}</p>
              </div>
            ) : null}

            {kind === "invoice" && issuer.bankDetails?.trim() ? (
              <div className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bank details for payment
                </p>
                <p className="mt-2 whitespace-pre-line leading-relaxed">
                  {issuer.bankDetails.trim()}
                </p>
              </div>
            ) : null}

            {notes?.trim() ? (
              <div className="mt-8 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </p>
                <p className="mt-2 whitespace-pre-line">{notes.trim()}</p>
              </div>
            ) : null}

            {children}

            <div className="mt-10 flex justify-center print:mt-8">
              <img
                src={publicApiUrl(
                  `/api/members/by-slug/${encodeURIComponent(issuer.slug)}/badge.svg`
                )}
                alt=""
                className="max-h-20 w-auto object-contain object-top [print-color-adjust:exact]"
              />
            </div>

            <footer className="mt-6 border-t border-slate-100 pt-6 text-center text-[11px] leading-relaxed text-slate-400 print:mt-4">
              <p>
                {kind === "invoice"
                  ? "This is an invoice issued by the business named above."
                  : "This quote is issued by the business named above."}{" "}
                It is not a bill from TradeVerify. TradeVerify membership fees
                are billed separately in your member portal under Billing.
              </p>
              <p className="mt-2 font-mono text-[10px] text-slate-400">
                Ref {reference} · {issuer.tvId}
              </p>
            </footer>
          </div>
        </article>

        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: accent }}
          >
            Print or save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
