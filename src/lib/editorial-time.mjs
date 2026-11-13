export const timeToken = /\{\{time:([a-z][a-z0-9-]*)\}\}/g;
export function validTimeRef(ref) {
  if (
    !ref ||
    !(
      ref.timeZone === 'UTC' ||
      /^[A-Za-z_]+\/[A-Za-z_+\-/0-9]+$/.test(ref.timeZone || '')
    ) ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(
      ref.at,
    ) ||
    !Number.isFinite(Date.parse(ref.at))
  )
    return false;
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: ref.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(new Date(ref.at))
        .map((p) => [p.type, p.value]),
    );
    const local = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    // Preserve source wall time as well as its offset. Reject DST mismatches.
    return ref.at.endsWith('Z')
      ? ref.timeZone === 'UTC' && local === ref.at.slice(0, 19)
      : local === ref.at.slice(0, 19);
  } catch {
    return false;
  }
}
export function displayEventTime(ref, locale, timeZone) {
  const d = new Date(ref.at),
    options = {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(timeZone ? { timeZone } : {}),
    };
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const isoDay = `${parts.year}-${parts.month}-${parts.day}`;
  const time = new Intl.DateTimeFormat(locale, options).format(d);
  return ref.showDate || isoDay !== ref.at.slice(0, 10)
    ? new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(timeZone ? { timeZone } : {}),
      }).format(d) +
        ' · ' +
        time
    : time;
}
export function fallbackTime(ref) {
  return new Date(ref.at).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}
export function plainEditorial(text, refs = {}) {
  return text
    .replace(/\{\{move:([+-]\d+(?:\.\d+)?%)\}\}/g, '$1')
    .replace(timeToken, (_, id) =>
      refs[id] ? fallbackTime(refs[id]) : '[time unavailable]',
    );
}
