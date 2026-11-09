/** 83400 ms -> "1:23.4" */
export function fmtTime(ms: number): string {
  const t = Math.max(0, Math.round(ms / 100));
  const tenths = t % 10, secs = Math.floor(t / 10) % 60, mins = Math.floor(t / 600);
  return `${mins}:${String(secs).padStart(2, '0')}.${tenths}`;
}
