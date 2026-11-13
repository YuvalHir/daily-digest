export type Quote = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  changePercent: number;
  quoteChange?: {
    percent: number;
    basis: 'previousClose';
    referencePrice: number;
    priceType: 'regularMarketPrice';
    session: 'regular';
    priceAsOf: string;
  } | null;
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
    hour12: false,
    ...(dates ? { year: 'numeric', month: '2-digit', day: '2-digit' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(stamp));
export function rangeText(q: Quote, he: boolean) {
  const names: Record<string, string> = he
    ? {
        '1h': 'שעה אחרונה של הנתונים',
        '5h': 'עד 5 שעות אחרונות',
        '1d': 'גרף יומי',
        '1mo': 'חודש אחרון',
        '1y': 'שנה אחרונה',
      }
    : {
        '1h': 'Last hour of data',
        '5h': 'Up to 5 hours',
        '1d': 'Daily chart',
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

export function dailyChange(q: Quote): number | null {
  const c = q.quoteChange;
  return c?.basis === 'previousClose' &&
    c.priceType === 'regularMarketPrice' &&
    c.session === 'regular' &&
    c.priceAsOf === q.asOf &&
    Number.isFinite(c.percent) &&
    Number.isFinite(c.referencePrice) &&
    c.referencePrice > 0 &&
    Math.abs(c.percent - (q.price / c.referencePrice - 1) * 100) < 0.000001
    ? c.percent
    : null;
}
// Reuse an already requested daily quote for price + daily percent as one pair.
// Switching chart ranges never starts another quote request here.
export async function quoteForDisplay(
  symbol: string,
  chart: Quote,
): Promise<Quote> {
  if (dailyChange(chart) !== null) return chart;
  let daily = cachedQuote(symbol, '1d');
  if (!daily) {
    const pending = requests.get(symbol + '|1d');
    if (pending) {
      try {
        daily = (await pending.promise)[symbol];
      } catch {
        /* Chart can remain price-only. */
      }
    }
  }
  return daily && dailyChange(daily) !== null ? daily : chart;
}
export function flashPrice(
  el: HTMLElement,
  previous: number | undefined,
  current: number,
) {
  if (
    previous === undefined ||
    !Number.isFinite(previous) ||
    previous === current
  )
    return;
  el.classList.remove('price-up', 'price-down');
  void el.offsetWidth;
  el.classList.add(current > previous ? 'price-up' : 'price-down');
}
export function quoteStamp(q: Quote, he: boolean) {
  const old = Date.now() - Date.parse(q.asOf) > 1800000;
  return {
    prefix: he ? 'עדכון ' : 'Updated ',
    time: localTime(
      q.asOf,
      !(new Date(q.asOf).toDateString() === new Date().toDateString()),
    ),
    suffix: old ? (he ? ' · נתונים ישנים' : ' · Older data') : '',
  };
}
export function shortRange(q: Quote, he: boolean) {
  return (
    he
      ? {
          '1h': 'גרף שעתי',
          '5h': 'גרף 5 שעות',
          '1d': 'גרף יומי',
          '1mo': 'גרף חודשי',
          '1y': 'גרף שנתי',
        }
      : {
          '1h': 'Hourly chart',
          '5h': '5-hour chart',
          '1d': 'Daily chart',
          '1mo': 'Monthly chart',
          '1y': 'Yearly chart',
        }
  )[q.range as '1h'];
}
