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
