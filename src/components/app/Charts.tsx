/**
 * Server-rendered charts (no client JS). Palette validated with the dataviz
 * validator (light surface): teal #16a38e + blue #3d6bc7 pass lightness,
 * chroma, CVD (ΔE 19.3) and normal-vision checks. Single-series charts use teal.
 * Every chart has a hover tooltip (<title>) and a screen-reader data table.
 */
export const SERIES = ["#16a38e", "#3d6bc7"] as const;

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => v / s <= 4) ?? 10 * pow;
  return Math.ceil(v / step) * step;
}

export function ColumnChart({ title, labels, series }: { title: string; labels: string[]; series: { name: string; values: number[] }[] }) {
  const W = 640;
  const H = 220;
  const pad = { l: 34, r: 8, t: 12, b: 26 };
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const band = (W - pad.l - pad.r) / labels.length;
  const barW = Math.min(24, (band * 0.7) / series.length);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const r = 4;
  const total = series.map((s) => s.values.reduce((a, b) => a + b, 0));
  return (
    <figure>
      {series.length > 1 && (
        <figcaption className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
          {series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: SERIES[i] }} />
              <span className="text-navy-900">{s.name}</span> <span className="tabular-nums">({total[i]})</span>
            </span>
          ))}
        </figcaption>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. Data table follows.`}>
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={pad.l} x2={W - pad.r} y1={y(tk)} y2={y(tk)} stroke="#ece7de" strokeWidth={1} />
            <text x={pad.l - 6} y={y(tk) + 3.5} textAnchor="end" fontSize="10" fill="#5b677d" className="tabular-nums">
              {Number.isInteger(tk) ? tk : tk.toFixed(1)}
            </text>
          </g>
        ))}
        {labels.map((label, i) => {
          const cx = pad.l + band * i + band / 2;
          const groupW = barW * series.length + 2 * (series.length - 1);
          return (
            <g key={label} className="[&:hover_path]:opacity-100 [&_path]:opacity-90">
              <rect x={pad.l + band * i} y={pad.t} width={band} height={H - pad.t - pad.b} fill="transparent">
                <title>{`${label}: ${series.map((s) => `${s.name} ${s.values[i]}`).join(", ")}`}</title>
              </rect>
              {series.map((s, si) => {
                const v = s.values[i];
                if (!v) return null;
                const x = cx - groupW / 2 + si * (barW + 2);
                const top = y(v);
                const bottom = y(0);
                const rr = Math.min(r, bottom - top);
                return (
                  <path key={s.name} fill={SERIES[si]} pointerEvents="none" d={`M${x},${bottom} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + barW - rr} Q${x + barW},${top} ${x + barW},${top + rr} V${bottom} Z`} />
                );
              })}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#5b677d">
                {label}
              </text>
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#c3d0e3" strokeWidth={1} />
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Period</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={l}>
              <td>{l}</td>
              {series.map((s) => (
                <td key={s.name}>{s.values[i]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars in HTML (crisp labels at any width); value at the bar tip. */
export function BarList({ title, rows }: { title: string; rows: { label: string; value: number; href?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure>
      <ul className="space-y-2.5" aria-label={title}>
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[9.5rem_minmax(0,1fr)] items-center gap-3 text-sm" title={`${r.label}: ${r.value}`}>
            <span className="truncate text-navy-900">{r.label}</span>
            <span className="flex items-center gap-2">
              <span className="h-4 rounded-r-[4px] transition-[width] duration-700" style={{ width: `${(r.value / max) * 85}%`, minWidth: r.value ? 4 : 0, background: SERIES[0] }} />
              <span className="tabular-nums text-xs font-semibold text-navy-900">{r.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
