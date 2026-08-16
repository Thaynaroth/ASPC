export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const hasFraction = Math.abs(n % 1) > 1e-9;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(value: number | string | null | undefined, currency?: string | null): string {
  const amount = formatMoney(value);
  return currency === 'KHR' || !currency ? `${amount} ៛` : `${amount} ${currency}`;
}

export function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTime(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function parseQtySyntax(input: string): { name: string; quantity: number } {
  const trimmed = input.trim();
  if (!trimmed) return { name: '', quantity: 1 };

  // "coca x2", "coca x 2", "coca*2", "coca 2x"
  let m = trimmed.match(/^(.*?)\s*x\s*(\d+)\s*$/i);
  if (m) return { name: m[1].trim(), quantity: parseInt(m[2], 10) };

  // "2x coca", "2 coca"
  m = trimmed.match(/^(\d+)\s*x?\s*(.+)$/i);
  if (m && m[2].trim()) return { name: m[2].trim(), quantity: parseInt(m[1], 10) };

  return { name: trimmed, quantity: 1 };
}
