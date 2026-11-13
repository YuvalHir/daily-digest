export type Quote = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  changePercent: number;
  asOf: string;
  range: string;
  interval: string;
  bars: { time: string; value: number }[];
  points: number[];
  seriesStart: string;
  seriesAsOf: string;
};
const completed = new Map<string, Quote>();
export const cachedQuote = (symbol: string, range: string) =>
  completed.get(symbol + '|' + range);
const requests = new Map<
  string,
  { at: number; promise: Promise<Record<string, Quote>> }
>();
export async function quoteData(
  symbol: string,
  range = '1d',
  fresh = false,
): Promise<Quote> {
  const key = symbol + '|' + range;
  let entry = requests.get(key);
  if (fresh || !entry || Date.now() - entry.at > 290000) {
    const promise = fetch(
      '/api/market?range=' + range + '&symbol=' + encodeURIComponent(symbol),
      { cache: 'no-store' },
    ).then(async (r) => {
      if (!r.ok) throw Error('Quote unavailable');
      const data = await r.json();
      return data.quotes;
    });
    entry = { at: Date.now(), promise };
    requests.set(key, entry);
    promise.catch(() => {
      if (requests.get(key) === entry) requests.delete(key);
    });
  }
  const q = (await entry.promise)[symbol];
  if (
    !q ||
    !Number.isFinite(q.price) ||
    !Number.isFinite(Date.parse(q.asOf)) ||
    !Array.isArray(q.bars) ||
    q.bars.length < 2 ||
    q.bars.some(
      (p) => !Number.isFinite(p.value) || !Number.isFinite(Date.parse(p.time)),
    )
  )
    throw Error('Quote unavailable');
  completed.set(symbol + '|' + range, q);
  return q;
}
export const localTime = (stamp: string, dates = true) =>
  new Intl.DateTimeFormat(navigator.language, {
    ...(dates ? { year: 'numeric', month: '2-digit', day: '2-digit' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(stamp));
export function rangeText(q: Quote, he: boolean) {
  const names: Record<string, string> = he
    ? {
        '1h': 'שעה אחרונה של הנתונים',
        '5h': 'עד 5 שעות אחרונות',
        '1d': 'יום המסחר האחרון',
        '1mo': 'חודש אחרון',
        '1y': 'שנה אחרונה',
      }
    : {
        '1h': 'Last hour of data',
        '5h': 'Up to 5 hours',
        '1d': 'Latest trading day',
        '1mo': 'Last month',
        '1y': 'Last year',
      };
  return names[q.range];
}
export function sparkPath(q: Quote, width: number, height: number, pad = 5) {
  const min = Math.min(...q.points),
    max = Math.max(...q.points),
    span = max - min || 1;
  return q.points
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${pad + (i / (q.points.length - 1)) * (width - 2 * pad)},${height - pad - ((v - min) / span) * (height - 2 * pad)}`,
    )
    .join(' ');
}

export function quoteStamp(q: Quote, he: boolean) {
  const sameDay = new Date(q.asOf).toDateString() === new Date().toDateString();
  const time = localTime(q.asOf, !sameDay);
  return {
    prefix: he ? 'ייתכן עיכוב · עודכן ב-' : 'May be delayed · Updated ',
    time,
  };
}
export function shortRange(q: Quote, he: boolean) {
  return (
    he
      ? {
          '1h': 'שעה',
          '5h': 'עד 5 שעות',
          '1d': 'יום מסחר',
          '1mo': 'חודש',
          '1y': 'שנה',
        }
      : {
          '1h': '1 hour',
          '5h': 'Up to 5 hours',
          '1d': 'Trading day',
          '1mo': '1 month',
          '1y': '1 year',
        }
  )[q.range as '1h'];
}
