/**
 * Re-mounts on every navigation → soft page transition.
 * Pure CSS (no hydration dependency): content paints immediately on first load.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
