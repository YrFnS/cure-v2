export function bookingDates(now = new Date()): string[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(today.formatToParts(now).map(p => [p.type, p.value]));
  const start = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  return Array.from({ length: 30 }, (_, i) => new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10));
}
