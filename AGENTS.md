# Repository rules

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`.
- Keep content and rendering separate. Publish each edition as one new JSON file in `public/data/YYYY-MM-DD/HHMM-type.json`.
- Never invent current prices, historical points, quotations, images or source URLs. Leave `marketRibbon` empty when verified data is unavailable. UI explains unavailable prices.
- Every editorial text has `he` and `en`. Summarized or translated posts must remain labeled as summaries, never presented as verbatim quotes.
- Preserve published editions. Correct factual errors transparently, not by silently substituting invented data.
- Use exact article/post URLs. Broad profile URLs are not a substitute for a source story.
- Never copy social-post text, translations or media. Publish independent summaries and source links. Optional official X embeds contain only ID/URL in `socialPost`, load only after visitor consent and use dnt=true. Test no X requests before consent and blocked/unavailable states. Prebuild rejects all copied `tweets` objects.
- Never archive X media. Do not put credentials, personal contact details or private conversation records into this public repository.
- Optional `asOf` (ISO offset datetime) and `sourceUrl` on market tickers capture quote provenance. `publishedAt` is the edition snapshot time; never label static data as live.
- Build static HTML only. No SSR or database. Only the official consent-gated X widget and branded TradingView widget may load third-party code.
- `npm test && npm run build` before push. Never commit generated `public/data/index.json`.
- Keep charts native SVG and isolate financial values with LTR `bdi`.
- Preserve mobile RTL and English LTR. Check 320px, 390px and desktop pixels after layout changes.
- Use repository owner YuvalHir's verified commit identity, never a guessed personal email.
