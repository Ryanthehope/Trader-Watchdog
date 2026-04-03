import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGetMember } from "../lib/api";
import {
  MemberDocumentPrintLayout,
  type DocumentIssuer,
} from "./MemberDocumentPrintLayout";

type Inv = {
  reference: string;
  customerName: string;
  customerAddress: string;
  customerEmail: string | null;
  customerPhone: string | null;
  lineItems: unknown;
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
  status: string;
  notes: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
};

export function MemberInvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<Inv | null>(null);
  const [issuer, setIssuer] = useState<DocumentIssuer | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGetMember<{ invoice: Inv; issuer: DocumentIssuer }>(
      `/api/member/portal/trade-invoices/${id}`
    )
      .then((d) => {
        setInv(d.invoice);
        setIssuer(d.issuer);
        document.title = `${d.invoice.reference} · ${d.issuer.businessName}`;
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [id]);

  if (err) {
    return <div className="p-8 text-red-600">{err}</div>;
  }
  if (!inv || !issuer) {
    return (
      <div className="p-8 text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <MemberDocumentPrintLayout
      kind="invoice"
      issuer={issuer}
      reference={inv.reference}
      title={`Invoice for ${inv.customerName}`}
      customerName={inv.customerName}
      customerAddress={inv.customerAddress}
      customerEmail={inv.customerEmail}
      customerPhone={inv.customerPhone}
      lineItems={inv.lineItems}
      subtotalPence={inv.subtotalPence}
      vatPence={inv.vatPence}
      totalPence={inv.totalPence}
      notes={inv.notes}
      createdAt={inv.createdAt}
      dueDate={inv.dueDate}
      paidAt={inv.paidAt}
      status={inv.status}
      paymentMethod={inv.paymentMethod}
    />
  );
}
