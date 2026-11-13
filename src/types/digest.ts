export type Locale = 'he' | 'en';

export type SectionId = 'tech' | 'markets' | 'geopolitics' | 'israel';

export type EditionType =
  | 'morning' // מהדורת בוקר (סיכום לילה ואסיה)
  | 'premarket' // טרום-מסחר ארה״ב ואירופה
  | 'open' // פתיחת המסחר בוול סטריט
  | 'mid' // עדכון אמצע יום
  | 'close' // סיכום נעילה
  | 'breaking'; // מהדורה מיוחדת / אירוע מתפרץ

export interface LocalizedText {
  he: string;
  en: string;
}

export interface LocalizedTextList {
  he: string[];
  en: string[];
}

export interface SparklineSeries {
  timeframe: '1D' | '7D' | '14D' | '30D';
  points: number[];
  prevClose?: number;
}

/** משותף לשתי השפות */
export interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  currency: 'USD' | 'ILS' | 'EUR' | 'PTS';
  changePercent: number;
  sparkline: SparklineSeries;
  asOf?: string;
  sourceUrl?: string;
}

export interface NewsSource {
  name: string;
  url: string;
  tag?: LocalizedText;
}

export interface TimeRef {
  precision?: 'minute' | 'second';
  at: string;
  timeZone: string;
  showDate?: boolean;
}
export interface DigestItem {
  timeRefs?: Record<string, TimeRef>;
  id: string;
  section: SectionId;
  isLead?: boolean;
  kicker: LocalizedText;
  headline: LocalizedText;
  summary: LocalizedText;
  bullets?: LocalizedTextList;
  heroImage?: {
    url: string;
    caption?: LocalizedText;
    credit?: string;
  };
  source: NewsSource;
  secondarySources?: NewsSource[];
  tickers?: TickerItem[];
  marketSymbols?: Array<
    'NASDAQ:NVDA' | 'NASDAQ:MSFT' | 'NASDAQ:AMD' | 'BITSTAMP:BTCUSD'
  >;
  marketCharts?: { symbol: string; range: '1h' | '5h' | '1d' | '1mo' | '1y' }[];
  socialPost?: { id: string; url: string };
  tweets?: never[];
  priority: number;
}

export interface DigestEdition {
  schemaVersion: '2.0';
  /** תאריך המהדורה בפורמט YYYY-MM-DD */
  date: string;
  /** מזהה הקובץ ללא סיומת, למשל "0830-morning" */
  editionSlug: string;
  /** סוג המהדורה לצורך תצוגת ציר הזמן ותגיות */
  editionType: EditionType;
  /** מספר מהדורה רץ גלובלי */
  editionNumber: number;
  /** חותמת זמן מלאה בפורמט ISO 8601, למשל "2026-11-13T08:30:00+02:00" */
  publishedAt: string;
  editorialLead: LocalizedText;
  /** One or two editorial sentences summarizing this edition. */
  topSummary?: LocalizedText;
  marketRibbon: TickerItem[];
  contextSymbols?: string[];
  /** Ordered explicit charts relevant to the lead story; no global defaults. */
  heroCharts?: {
    symbol: string;
    range: '1h' | '5h' | '1d' | '1mo' | '1y';
    label: LocalizedText;
  }[];
  items: DigestItem[];
}

export interface DigestEditionIndexEntry {
  slug: string; // "0830-morning"
  editionType: EditionType;
  editionNumber: number;
  publishedAt: string; // ISO timestamp למיון כרונולוגי מדויק
  headlinePreview: LocalizedText;
  itemCount: number;
}

export interface DigestDayIndex {
  date: string; // "2026-11-13"
  latestEditionSlug: string;
  editionCount: number;
  /** ממוין כרונולוגית מתחילת היום לסופו עבור ציר הזמן */
  editions: DigestEditionIndexEntry[];
}

export interface DigestIndex {
  generatedAt: string;
  latestDate: string;
  latestEditionSlug: string;
  /** ממוין מהתאריך החדש לישן */
  days: DigestDayIndex[];
}
