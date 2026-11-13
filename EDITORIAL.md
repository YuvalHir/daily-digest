# Editorial standards

How every Daily Digest edition is selected, written and corrected. Rendering and
repository rules live in AGENTS.md and README.md; this document owns the
editorial line. It is maintained by the edition's continuing editorial desk and
grows with every correction.

## The continuing desk

The editorial desk composes each edition: reviews the day's verified
source material, selects and orders the stories, writes all copy in both
languages, and supplies the masthead summary. The desk does not start from zero
each edition. It keeps this file, applies the lessons log below, and adds a
dated entry whenever the publisher or a reader corrects the edition. A
correction that generalizes becomes a rule in the relevant section.

The Voice, Selection, Masthead and Sourcing sections are the desk's own working
standards. The lessons log records actual publisher corrections and fixes; a
dated entry never claims a publisher instruction that did not happen.

## Voice

- A financial journal for readers who want context, not a feed. Context before
  noise.
- Every item is a complete standalone sentence with enough context to be
  understood on its own. No half-sentences, no merged unrelated events, no
  orphaned references.
- Hebrew and English are each written natively and checked for parity. Neither
  is a literal translation of the other.
- Hebrew style: tight and professional, standard newsroom Hebrew. First mention
  of any name carries identifying context. Percent format "ירידה של 0.41%" or
  "-0.41%", never "0.41%-". One event per bullet. A technical term gets a
  short explanation on first use.

## Selection and continuity between editions

- Importance is not the same as novelty. Stories are selected and ordered by
  reader importance; a fresher minor item does not displace an older central
  one.
- A morning story that is still central stays in the closing edition. Keep its
  stable story id, update the copy with real developments, and retain original
  timestamps through timeRefs. Recheck whether a later update changes or
  overturns it; never present an old claim as a new development.
- Merge related reports into one coherent story. A later denial or correction
  goes into the headline or summary where it changes the news, while preserving
  what was reported and who reported it.
- Publish only genuinely distinct stories. Never add filler to hit a count.

## Masthead summary (topSummary)

- One or two short sentences per language, replacing the generic slogan.
- Summarizes the edition's most important news: the lead plus at most one
  second theme, in plain natural news language. Never a compressed index of
  the edition's stories.
- Grounded wholly in the edition's own items. Not a navigation instruction and
  not a second headline.
- No exact clock times and no fragile price moves; those belong in items with
  their sources.
- Copy is supplied with the item ids that support it.

## Sourcing and numbers

- A linked source label names the actual linked account or outlet. If an X
  account quotes CNBC, the label is the X account and CNBC is attributed in
  the article text; never merge the two into one misleading label.
- Every number, move and claim in an item has a URL in source or
  secondarySources. Several accounts quoting one outlet are not independent
  confirmations.
- Times appear only as {{time:key}} markers backed by timeRefs entries with a
  full offset-bearing timestamp and matching IANA zone. Never type a guessed
  local clock value into prose. Verify facts against the full source text,
  never a display truncation.
- {{move:±x%}} marks a verified move with an explicit as-of source. State the
  figure's period, distinguish percent from percentage points, and never
  convert a monetary gap into a movement percent. A stale percent never
  survives into a later edition as if current.
- Prices, series, images and URLs are never invented. marketRibbon stays empty
  without verified data.
- Charts attached to a story match the exact asset the story cites; an index
  and a similarly named index are not interchangeable.

## Corrections

- Published editions are preserved. A factual error is corrected transparently
  in a new edition or a documented fix, never by silently substituting data.
- Each correction adds a dated entry to the lessons log.

## Lessons log

- 2026-11-13 (fix): a source label merged an X account with the outlet it
  quoted. Rule: label names the account; the outlet is attributed in text;
  see Sourcing.
- 2026-11-13 (fix): a lead carried unsourced figures (a prediction-market
  probability and a share move). Rule: every asserted number gets its own
  source and time.
- 2026-11-13 (fix): an hours-old percent was presented as current. Rule:
  static editions never carry unverified current prices; the chart carries
  the day's move.
- 2026-11-13 (reader request): a morning story that is still relevant
  stays in the closing edition. Rule: see Selection and continuity.
- 2026-11-13 (reader request): the masthead summary carries only the
  very most important points. Rule: lead plus at most one second theme, plain
  language, no compressed edition index; see Masthead summary.
