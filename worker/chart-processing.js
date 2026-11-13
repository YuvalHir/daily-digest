// Candidate only, not imported by the live adapter until separately approved.
// Keep source validation and yahoo-finance2 request handling. Select source indices
// before constructing date strings and avoid Intl formatting every source bar.
const formatters = new Map();
function dayFormatter(timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    if (formatters.size >= 32)
      formatters.delete(formatters.keys().next().value);
    formatters.set(timeZone, f);
  }
  return f;
}
export function chartBars(result, range) {
  const timestamps = result.timestamp,
    closes = result.indicators?.quote?.[0]?.close;
  if (
    !Array.isArray(timestamps) ||
    !Array.isArray(closes) ||
    timestamps.length !== closes.length
  )
    throw Error('Invalid source arrays');
  const valid = [];
  let previous = -Infinity;
  for (let i = 0; i < timestamps.length; i++) {
    if (!Number.isFinite(timestamps[i]) || timestamps[i] < previous)
      throw Error('Unordered source timestamps');
    previous = timestamps[i];
    if (Number.isFinite(closes[i])) valid.push(i);
  }
  if (!valid.length) throw Error('No source bars');
  let lo = 0,
    hi = valid.length - 1;
  const end = timestamps[valid.at(-1)];
  if (['1h', '5h', '1d'].includes(range)) {
    const fmt =
      range === '1d' ? dayFormatter(result.meta.exchangeTimezoneName) : null;
    const latestDay = fmt?.format(new Date(end * 1000));
    const from = end - (range === '1h' ? 1 : 5) * 3600;
    const keep = (i) =>
      fmt
        ? fmt.format(new Date(timestamps[valid[i]] * 1000)) === latestDay
        : timestamps[valid[i]] >= from;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (keep(mid)) hi = mid;
      else lo = mid + 1;
    }
  }
  return valid
    .slice(lo)
    .map((i) => ({
      time: new Date(timestamps[i] * 1000).toISOString(),
      value: closes[i],
    }));
}
