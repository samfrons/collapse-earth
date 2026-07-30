# Collapse Earth — Threshold

An interactive atlas of Earth's tipping points, and where independent assessments say climate funding gaps are widest. Research and opinion behind the Collapse Capital satire — not investment advice.

## Structure

- `collapse-tech.html` — the live site (served at `/`)
- `collapse-tech-a.html`, `collapse-tech-b.html`, `collapse-tech-c.html` — redesign drafts/variants, not deployed
- `collapse-tech-research.md` — supporting research notes

The site is static (plain HTML/CSS/JS, no build step) and deploys as-is to Vercel, with `/` rewritten to `collapse-tech.html`.

## Local development

Open `collapse-tech.html` directly in a browser, or serve the directory with any static file server:

```bash
npx serve .
```

## Deployment

Deployed on [Vercel](https://vercel.com). Pushing to `main` triggers a production deployment; other branches get preview deployments.

## License

MIT — see [LICENSE](LICENSE).
