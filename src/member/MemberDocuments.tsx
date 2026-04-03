import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  apiGetMember,
  apiGetMemberBlob,
  apiPostMemberForm,
  apiSendMember,
} from "../lib/api";

type DocRow = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MemberDocuments() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGetMember<{ documents: DocRow[] }>("/api/member/portal/documents")
      .then((d) => setRows(d.documents))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem(
      "file"
    ) as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const d = await apiPostMemberForm<{ document: DocRow }>(
        "/api/member/portal/documents",
        fd
      );
      setRows((r) => [d.document, ...r]);
      input.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const download = async (id: string, name: string) => {
    try {
      const blob = await apiGetMemberBlob(
        `/api/member/portal/documents/${id}/file`
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this file permanently?")) return;
    setDeleting(id);
    try {
      await apiSendMember(`/api/member/portal/documents/${id}`, {
        method: "DELETE",
      });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 sm:p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Upload insurance certificates, accreditations, and photos (PDF or
        images, up to 10 MB each). Files are stored for your TradeVerify record
        and are not shown on your public profile.
      </p>

      <form
        onSubmit={onUpload}
        className="mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block text-sm font-medium text-slate-700">
          Add file
        </label>
        <input
          name="file"
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
          className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-500"
        />
        <button
          type="submit"
          disabled={uploading}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-slate-500">No documents uploaded yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {d.originalName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.mimeType}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatSize(d.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => download(d.id, d.originalName)}
                      className="text-emerald-700 hover:underline"
                    >
                      Download
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button
                      type="button"
                      disabled={deleting === d.id}
                      onClick={() => remove(d.id)}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deleting === d.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
