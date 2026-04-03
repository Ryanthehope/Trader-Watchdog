import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGetMember } from "../lib/api";
import {
  MemberDocumentPrintLayout,
  type DocumentIssuer,
} from "./MemberDocumentPrintLayout";

type Quote = {
  reference: string;
  customerName: string;
  customerAddress: string;
  customerEmail: string | null;
  customerPhone: string | null;
  title: string;
  lineItems: unknown;
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
  status: string;
  notes: string | null;
  createdAt: string;
};

export function MemberQuotePrint() {
  const { id } = useParams<{ id: string }>();
  const [q, setQ] = useState<Quote | null>(null);
  const [issuer, setIssuer] = useState<DocumentIssuer | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGetMember<{ quote: Quote; issuer: DocumentIssuer }>(
      `/api/member/portal/quotes/${id}`
    )
      .then((d) => {
        setQ(d.quote);
        setIssuer(d.issuer);
        document.title = `${d.quote.reference} · ${d.issuer.businessName}`;
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [id]);

  if (err) {
    return <div className="p-8 text-red-600">{err}</div>;
  }
  if (!q || !issuer) {
    return (
      <div className="p-8 text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <MemberDocumentPrintLayout
      kind="quote"
      issuer={issuer}
      reference={q.reference}
      title={q.title}
      customerName={q.customerName}
      customerAddress={q.customerAddress}
      customerEmail={q.customerEmail}
      customerPhone={q.customerPhone}
      lineItems={q.lineItems}
      subtotalPence={q.subtotalPence}
      vatPence={q.vatPence}
      totalPence={q.totalPence}
      notes={q.notes}
      createdAt={q.createdAt}
    />
  );
}
