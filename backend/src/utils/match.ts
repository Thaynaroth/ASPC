// Fuzzy product-name matching for the handwritten-invoice flow.
// Users type names the way they say them ("coca", "Coca 500ml", "កូកា") —
// we score candidate products and return the best matches.

export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u200b-\u200d\uFEFF]/g, '')
    .replace(/[.,\-_/\\'’"()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[n];
}

export interface ScoredMatch<T> {
  item: T;
  score: number;
}

// Score 0..100. 100 = exact normalized match.
export function scoreName(input: string, candidate: string): number {
  const q = normalizeName(input);
  const c = normalizeName(candidate);
  if (!q) return 0;

  if (c === q) return 100;

  // word-prefix match ("coca" → "coca 500ml"): strong
  if (c.startsWith(q + ' ')) return 92;
  if (q.startsWith(c + ' ')) return 90;

  // every word of the query is contained (order-insensitive)
  const qWords = q.split(' ');
  const cWords = c.split(' ');
  if (qWords.every((w) => cWords.includes(w))) return 85;
  if (cWords.every((w) => qWords.includes(w))) return 82;

  if (c.includes(q)) return 70;

  // sku-style shorthand match: initials of words ("cws" → "classic white sneaker")
  if (q.length >= 2 && cWords.length >= 2) {
    const initials = cWords
      .map((w) => w[0])
      .join('')
      .slice(0, q.length);
    if (initials === q) return 78;
  }

  // fuzzy typo tolerance
  if (q.length >= 4) {
    const dist = editDistance(q, c.slice(0, q.length + 2));
    if (dist <= 1) return 60;
    if (dist <= 2 && q.length >= 6) return 50;
  }

  return 0;
}

export function bestMatches<T>(
  query: string,
  candidates: T[],
  getName: (item: T) => string,
  limit = 6,
): ScoredMatch<T>[] {
  if (!normalizeName(query)) return [];
  return candidates
    .map((item) => ({ item, score: scoreName(query, getName(item)) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || getName(a.item).localeCompare(getName(b.item)))
    .slice(0, limit);
}
