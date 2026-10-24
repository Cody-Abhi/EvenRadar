import type { SourceStatus } from "@/lib/types";

/**
 * Per-source status strip, e.g. "DEVFOLIO ✓ 12 · DEVPOST ✗ blocked".
 * Green block for a source that returned, red block for one that failed —
 * shown even while results render.
 */
export default function StatusStrip({ sources }: { sources: SourceStatus[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="scroll-thin flex gap-2 overflow-x-auto pb-2 text-xs font-bold uppercase tracking-wide">
      {sources.map((s) => (
        <a
          key={`${s.name}-${s.url}`}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          title={s.error ? `${s.name}: ${s.error}` : `${s.name}: ${s.count} found`}
          className={`brutal-press flex shrink-0 items-center gap-1.5 px-3 py-1.5 ${
            s.ok ? "bg-brut-lime" : "bg-brut-red text-white"
          }`}
        >
          <span>{s.name}</span>
          {s.ok ? (
            <span aria-label="ok" className="rounded-none bg-black px-1.5 text-brut-lime">
              ✓ {s.count}
            </span>
          ) : (
            <span aria-label="failed" className="max-w-[12rem] truncate normal-case">
              ✗ {s.error ?? "failed"}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
