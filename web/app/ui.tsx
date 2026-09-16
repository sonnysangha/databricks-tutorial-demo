import type { ReactNode } from "react";

const categoryStyles: Record<string, string> = {
  bug: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  feature_request: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  complaint: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  praise: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  question: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  spam: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
};

const severityStyles: Record<string, string> = {
  critical: "border-rose-400/60 bg-rose-500/20 text-rose-200",
  high: "border-orange-400/50 bg-orange-500/15 text-orange-200",
  medium: "border-yellow-400/40 bg-yellow-500/10 text-yellow-200",
  low: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
};

const statusStyles: Record<string, string> = {
  approved: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
  rejected: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  needs_info: "border-sky-400/50 bg-sky-500/15 text-sky-200",
};

export function Pill({
  kind,
  value,
}: {
  kind: "category" | "severity" | "status";
  value: string;
}) {
  const map =
    kind === "category"
      ? categoryStyles
      : kind === "severity"
        ? severityStyles
        : statusStyles;
  const cls = map[value] ?? "border-border bg-surface-2 text-muted";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cls}`}
    >
      {value.replace("_", " ")}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const label: Record<string, string> = {
    app_store: "App Store",
    google_play: "Google Play",
    support: "Support",
    in_app: "In-app",
  };
  return (
    <span className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
      {label[source] ?? source}
    </span>
  );
}

export function Stars({ rating }: { rating: number | null }) {
  if (rating == null)
    return <span className="text-xs text-muted">no rating</span>;
  return (
    <span
      className="text-xs tracking-tight text-amber-300"
      aria-label={`${rating} stars`}
    >
      {"★".repeat(rating)}
      <span className="text-zinc-600">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
