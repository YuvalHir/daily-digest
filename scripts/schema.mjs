import { z } from 'zod';
import { validTimeRef, timeToken } from '../src/lib/editorial-time.mjs';
export const TimeRef = z
  .object({
    at: z.string().datetime({ offset: true }),
    timeZone: z.string().min(1),
    precision: z.enum(['minute', 'second']).optional(),
    showDate: z.boolean().optional(),
  })
  .strict()
  .refine(
    validTimeRef,
    'Source timestamp offset must match its IANA zone on that date',
  );
const TimeRefs = z.record(z.string().regex(/^[a-z][a-z0-9-]*$/), TimeRef);
const safeUrl = z
  .string()
  .refine(
    (v) => /^https:\/\//.test(v) || /^\/(?!\/)/.test(v),
    'Use HTTPS or a local absolute path',
  );
export const LocalizedText = z
  .object({
    he: z.string().trim().min(2),
    en: z
      .string()
      .trim()
      .min(2)
      .regex(/[a-zA-Z]/),
  })
  .strict();
const localList = z
  .object({
    he: z.array(z.string().min(2)).min(1),
    en: z.array(z.string().min(2)).min(1),
  })
  .strict();
export const EditionType = z.enum([
  'morning',
  'premarket',
  'open',
  'mid',
  'close',
  'breaking',
]);
export const TickerItem = z
  .object({
    symbol: z.string().min(1),
    name: z.string().min(1),
    price: z.number().finite().nonnegative(),
    currency: z.enum(['USD', 'ILS', 'EUR', 'PTS']),
    changePercent: z.number().finite(),
    sparkline: z
      .object({
        timeframe: z.enum(['1D', '7D', '14D', '30D']),
        points: z.array(z.number().finite()).min(2).max(1000),
        prevClose: z.number().finite().optional(),
      })
      .strict(),
    asOf: z.string().datetime({ offset: true }).optional(),
    sourceUrl: safeUrl.optional(),
  })
  .strict();
const Source = z
  .object({
    name: z.string().min(1),
    url: safeUrl,
    tag: LocalizedText.optional(),
  })
  .strict();
const marketKey = z.union([
  z.enum(['NASDAQ:NVDA', 'NASDAQ:MSFT', 'NASDAQ:AMD', 'BITSTAMP:BTCUSD']),
  z.string().regex(/^[A-Z0-9^][A-Z0-9.^=-]{0,19}$/),
]);
export const DigestItem = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    section: z.enum(['tech', 'markets', 'geopolitics', 'israel']),
    isLead: z.boolean().optional(),
    timeRefs: TimeRefs.optional(),
    kicker: LocalizedText,
    headline: LocalizedText,
    summary: LocalizedText,
    bullets: localList.optional(),
    heroImage: z
      .object({
        url: safeUrl,
        caption: LocalizedText.optional(),
        credit: z.string().optional(),
      })
      .strict()
      .optional(),
    source: Source,
    secondarySources: z.array(Source).optional(),
    tickers: z.array(TickerItem).optional(),
    marketSymbols: z
      .array(
        z.enum(['NASDAQ:NVDA', 'NASDAQ:MSFT', 'NASDAQ:AMD', 'BITSTAMP:BTCUSD']),
      )
      .max(4)
      .optional(),
    marketCharts: z
      .array(
        z
          .object({
            symbol: marketKey,
            range: z.enum(['1h', '5h', '1d', '1mo', '1y']),
          })
          .strict(),
      )
      .max(4)
      .optional(),
    socialPost: z
      .object({
        id: z.string().regex(/^\d+$/),
        url: z
          .string()
          .url()
          .regex(
            /^https:\/\/(x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+$/,
          ),
      })
      .strict()
      .refine((p) => p.url.endsWith('/' + p.id), 'Post ID must match URL')
      .optional(),
    tweets: z.array(z.never()).max(0).optional(),
    priority: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((item, ctx) => {
    const fields = [
      item.headline,
      item.summary,
      item.kicker,
      item.bullets,
      item.source,
      item.secondarySources,
      item.heroImage,
    ];
    const text = JSON.stringify(fields);
    if (/\{\{time:/.test(text.replace(timeToken, '')))
      ctx.addIssue({ code: 'custom', message: 'Malformed time marker' });
    for (const match of text.matchAll(timeToken))
      if (!item.timeRefs?.[match[1]])
        ctx.addIssue({
          code: 'custom',
          message: 'Unknown time ref: ' + match[1],
        });
  });
export const DigestEdition = z
  .object({
    schemaVersion: z.literal('2.0'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    editionSlug: z
      .string()
      .regex(/^\d{4}-(morning|premarket|open|mid|close|breaking)$/),
    editionType: EditionType,
    editionNumber: z.number().int().positive(),
    publishedAt: z.string().datetime({ offset: true }),
    editorialLead: LocalizedText,
    topSummary: LocalizedText.optional(),
    marketRibbon: z.array(TickerItem),
    contextSymbols: z.array(marketKey).max(12).optional(),
    heroCharts: z
      .array(
        z
          .object({
            symbol: marketKey,
            range: z.enum(['1h', '5h', '1d', '1mo', '1y']),
            label: LocalizedText,
          })
          .strict(),
      )
      .max(4)
      .optional(),
    items: z.array(DigestItem).min(1).max(100),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!v.editionSlug.endsWith('-' + v.editionType))
      ctx.addIssue({ code: 'custom', message: 'Edition type must match slug' });
    if (!v.publishedAt.startsWith(v.date))
      ctx.addIssue({
        code: 'custom',
        message: 'Publication date must match edition date',
      });
    if (
      v.editionSlug.slice(0, 4) !== v.publishedAt.slice(11, 16).replace(':', '')
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Slug time must match publishedAt',
      });
    if (
      Number.isNaN(Date.parse(v.date)) ||
      new Date(v.date).toISOString().slice(0, 10) !== v.date
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid calendar date' });
    if (new Set(v.items.map((i) => i.id)).size !== v.items.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate item IDs' });
    const lead = v.items.find((i) => i.isLead) || v.items[0];
    if (
      (lead.marketCharts?.length ||
        lead.marketSymbols?.length ||
        lead.tickers?.length) &&
      !v.heroCharts?.length
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Lead story has financial assets: provide explicit relevant heroCharts, never rely on unrelated defaults',
      });
    if (
      v.heroCharts &&
      new Set(v.heroCharts.map((c) => c.symbol)).size !== v.heroCharts.length
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate hero chart symbols' });
    if (v.items.filter((i) => i.isLead).length > 1)
      ctx.addIssue({
        code: 'custom',
        message: 'Only one lead story is allowed',
      });
  });
