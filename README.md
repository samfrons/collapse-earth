# Collapse Earth — Threshold

An interactive atlas of Earth's tipping points, and where independent assessments say climate funding gaps are widest. Research and opinion behind the Collapse Capital satire — not investment advice.

## Structure

- `collapse-tech.html` — the live site (served at `/`)
- `collapse-tech-a.html`, `collapse-tech-b.html`, `collapse-tech-c.html` — redesign drafts/variants, not deployed
- `collapse-tech-research.md` — supporting research notes

The site is static (plain HTML/CSS/JS, no build step) and deploys as-is to Vercel, with `/` rewritten to `collapse-tech.html`.

### v2 redesign (branch `redesign/v2-variants`)

Four full-page redesigns exploring the same tipping-point/funding/hypothesis
content in different visual languages, plus a switcher page to compare them:

- `collapse-v2-index.html` — dark switcher page linking all four variants
- `collapse-v2-coresample.html` — **Core Sample**, the chosen lead direction
  (scroll-as-drill-core, progressive disclosure, right-side dossier pane)
- `collapse-v2-deepfield.html` — Deep Field (bioluminescent dark-ocean globe)
- `collapse-v2-signal.html` — Signal / Noise (observatory instrument chrome)
- `collapse-v2-overgrowth.html` — Overgrowth (desaturation-to-verdant scroll arc)
- `collapse-data.v2.js` — shared data layer all four variants render from
  (tipping-system thresholds, funding ledger, company atlas, hypothesis
  engine; last updated 2026-07-30)

None of the above are deployed — `/` still serves `collapse-tech.html`. Open
`collapse-v2-index.html` locally (see below) to browse the variants.

The durable references for this redesign are committed under `docs/`:

- `docs/superpowers/specs/2026-07-30-collapse-earth-redesign-design.md` — design spec
- `docs/superpowers/plans/2026-07-30-collapse-earth-v2-variants.md` — implementation plan

Task briefs, the shared variant contract, per-variant implementation reports and
review notes were working documents kept in a local, uncommitted
`.superpowers/sdd/` directory; they are not part of the repository and will not
be present in a fresh clone.

## Local development

Open `collapse-tech.html` directly in a browser, or serve the directory with any static file server:

```bash
npx serve .
```

## Deployment

Deployed on [Vercel](https://vercel.com). Pushing to `main` triggers a production deployment; other branches get preview deployments.

## License

MIT — see [LICENSE](LICENSE).
