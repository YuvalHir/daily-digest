# Daily Digest visual system, editorial revision

Purpose: a bilingual financial journal that is useful to scan and comfortable to read. Not a landing page or a trading terminal. Current reference study: Impeccable's Read mode, layout, typeset and color guidance, inspected on the live site and its public source. No external hooks or browser extensions were installed.

Composition: a warm wire-journal front page. The lead story has more width than its supporting market desk, with a large open headline instead of a colored hero block. The market desk alone has a muted sand surface and a145-150px plot. A double rule closes the lead. Stories use asymmetric two-column reading widths on desktop, a single column on mobile, small sequence numbers and section labels. Strong rules and type size distinguish the ranks without nested cards.

Palette: warm neutral #f2efe8 canvas, charcoal #242521 text, #e6e1d7 chart desk and #c8c2b5 rules. Restrained brown is for secondary actions, not large regions. Red #b22e2b and green #146c42 encode price direction, always accompanied by explicit -/+. Dark mode has its own olive-charcoal neutrals and lighter semantic colors. The previously proposed navy block was rejected and removed.

Typography: self-hosted Heebo with deliberate size/weight contrast. Lead34px mobile/47-52px desktop. Story heads25px, first desktop story30px. Body14-17px with1.8 line height. JetBrains Mono only for financial values, sequence numbers and times. Metadata is quieter but readable. All controls remain keyboard-focusable.

Chart semantics: native SVG line chart, never called candlesticks. Each story's JSON chooses its own source symbol and range. Small charts show one concise range/update line. Top price is the latest quote, range percent is first-to-last chart point. Source quote and graph endpoint timestamps can differ and stay distinct. Browser locale/timezone controls display. No synthetic fill or fake prices.

Responsive checks: Hebrew/English, light/dark,320/390/1440; check body overflow, visible quote labels, long titles, focus, chart failure, X consent, and saved theme. Preview screenshots are rendered with previously fetched source snapshots offline; no source collection is needed to review design.
