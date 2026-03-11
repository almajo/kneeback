export function getPhaseFromDate(surgeryDate: string): string {
  const days = Math.floor(
    (Date.now() - new Date(surgeryDate).getTime()) / 86400000
  );
  if (days <= 14) return "Acute Phase";
  if (days <= 42) return "Early Rehab";
  if (days <= 90) return "Strengthening";
  return "Return to Activity";
}

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}
