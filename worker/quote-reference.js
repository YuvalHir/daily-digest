// Quote movement is distinct from chart-range movement. Never infer the
// previous close from chartPreviousClose or the last bar of an earlier day.
export function quoteReference(meta) {
  if (!['EQUITY', 'ETF', 'INDEX'].includes(meta.instrumentType)) return null;
  if (
    !Number.isFinite(meta.previousClose) ||
    meta.previousClose <= 0 ||
    !Number.isFinite(meta.regularMarketPrice) ||
    meta.regularMarketPrice <= 0
  )
    return null;
  const regular = meta.currentTradingPeriod?.regular;
  const time = meta.regularMarketTime?.getTime?.();
  const start = regular?.start?.getTime?.();
  const end = regular?.end?.getTime?.();
  // Fail closed when the quote cannot be bound to this regular session.
  if (![time, start, end].every(Number.isFinite) || time < start || time > end)
    return null;
  return {
    percent: (meta.regularMarketPrice / meta.previousClose - 1) * 100,
    basis: 'previousClose',
    referencePrice: meta.previousClose,
    priceType: 'regularMarketPrice',
    session: 'regular',
    priceAsOf: meta.regularMarketTime.toISOString(),
  };
}

// Crypto days follow the provider's verified 00:00 UTC daily session.
// Use the completed preceding DAILY candle, never a 5-minute approximation,
// rolling 24-hour percent, daily open, or range-dependent chartPreviousClose.
export function cryptoQuoteReference(meta, daily) {
  if (
    meta.instrumentType !== 'CRYPTOCURRENCY' ||
    daily?.meta?.symbol !== meta.symbol ||
    daily.meta.instrumentType !== 'CRYPTOCURRENCY' ||
    daily.meta.exchangeTimezoneName !== 'UTC' ||
    daily.meta.gmtoffset !== 0 ||
    daily.meta.dataGranularity !== '1d' ||
    !Number.isFinite(meta.regularMarketPrice) ||
    meta.regularMarketPrice <= 0
  )
    return null;
  const time = meta.regularMarketTime?.getTime?.();
  if (!Number.isFinite(time)) return null;
  const day = Math.floor(time / 86400000) * 86400;
  const times = daily.timestamp,
    closes = daily.indicators?.quote?.[0]?.close;
  if (
    !Array.isArray(times) ||
    !Array.isArray(closes) ||
    times.length !== closes.length ||
    times.some(
      (t, i) =>
        !Number.isFinite(t) || t % 86400 !== 0 || (i > 0 && t <= times[i - 1]),
    )
  )
    return null;
  const current = times.indexOf(day),
    previous = times.indexOf(day - 86400);
  if (current < 0 || previous < 0 || previous !== current - 1) return null;
  const referencePrice = closes[previous];
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) return null;
  return {
    percent: (meta.regularMarketPrice / referencePrice - 1) * 100,
    basis: 'previousDailyCloseUTC',
    referencePrice,
    referenceAsOf: new Date(day * 1000).toISOString(),
    referenceBarStart: new Date((day - 86400) * 1000).toISOString(),
    priceType: 'regularMarketPrice',
    session: 'utc24h',
    priceAsOf: meta.regularMarketTime.toISOString(),
  };
}
