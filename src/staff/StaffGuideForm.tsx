import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiGetAuth, apiSend } from "../lib/api";

export function StaffGuideForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new" || !id;

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [readTime, setReadTime] = useState("");
  const [bodyText, setBodyText] = useState("");

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetAuth<{
          guide: {
            slug: string;
            title: string;
            excerpt: string;
            readTime: string;
            body: string[];
          };
        }>(`/api/admin/guides/${id}`);
        if (cancelled) return;
        const g = data.guide;
        setSlug(g.slug);
        setTitle(g.title);
        setExcerpt(g.excerpt);
        setReadTime(g.readTime);
        setBodyText(g.body.join("\n\n"));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const paragraphs = bodyText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!paragraphs.length) {
      setError("Add at least one paragraph (separate paragraphs with a blank line).");
      return;
    }
    const payload = { slug, title, excerpt, readTime, body: paragraphs };
    setSaving(true);
    try {
      if (isNew) {
        await apiSend("/api/admin/guides", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiSend(`/api/admin/guides/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      navigate("/staff/guides");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div>
      <Link
        to="/staff/guides"
        className="text-sm text-brand-300 hover:text-brand-200"
      >
        ← Guides
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold text-white">
        {isNew ? "Add guide" : "Edit guide"}
      </h1>

      <form className="mt-8 max-w-2xl space-y-5" onSubmit={onSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-slate-300">
            URL slug
          </label>
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="before-you-hire"
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Title
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Read time
          </label>
          <input
            required
            value={readTime}
            onChange={(e) => setReadTime(e.target.value)}
            placeholder="6 min read"
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Excerpt
          </label>
          <textarea
            required
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Body (paragraphs separated by a blank line)
          </label>
          <textarea
            required
            rows={14}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 font-mono text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-500 px-6 py-2.5 font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <Link
            to="/staff/guides"
            className="rounded-xl border border-white/15 px-6 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
