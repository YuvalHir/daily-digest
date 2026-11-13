# Contributing

Use Node.js 22+, `npm ci`, and Conventional Commits. Run `npm test`, `npm run build`, and `npm audit --audit-level=high` before a pull request.

For a new edition, add a bilingual JSON file matching `scripts/schema.mjs`. The filename, date, type and publication time must agree. Edition numbers are globally unique. The prebuild validates all editions and generates the archive index.

Keep financial snapshots honest: use measured values only, cite the source, label the observation time, and do not interpolate missing history. Do not copy the illustrative data from a design document into a real edition.
