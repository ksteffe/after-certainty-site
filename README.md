# After Certainty · Site

> **This repository is read-only and archived.**
>
> Site source now lives at
> [`ksteffe/after-certainty`](https://github.com/ksteffe/after-certainty/tree/main/apps/site)
> (`apps/site`). Open issues and PRs against the monorepo; do not push here.

Intellectual commons surface for **After Certainty** — books metadata, podcast hub, patterns library, and collaboration entry points. Active development continues in the monorepo; this tree is kept for history only.

## Stack

- **Next.js** (App Router, React Server Components by default)
- **TypeScript**
- **Tailwind CSS v4** with `@tailwindcss/typography`
- **MDX** via `@next/mdx` + `remark-gfm`
- **next-themes** for appearance (defaults to dark; light tokens included)

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — see NEXT_PUBLIC_SITE_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command          | Purpose                |
| ---------------- | ---------------------- |
| `npm run dev`    | Local development      |
| `npm run build`  | Production build       |
| `npm run start`  | Serve production build |
| `npm run lint`   | ESLint                 |
| `npm run format` | Prettier write         |

## Environment

Set **`NEXT_PUBLIC_SITE_URL`** to your canonical domain so metadata, Open Graph, RSS links, and `sitemap.xml` resolve correctly. Production: `https://www.after-certainty.com` (see `.env.example`).

## Content architecture

| Kind             | Location / notes                                            |
| ---------------- | ----------------------------------------------------------- |
| Typed models     | `types/content.ts`                                          |
| Sample manifests | `data/*.json` — replace or sync from CI / books repo output |
| MDX pages        | `content/mdx/*.mdx`, imported from routes under `app/`      |
| Site copy config | `lib/site-config.ts`                                        |

Wire real manifests by swapping JSON under `data/` or pointing loaders in `lib/content-data.ts` at generated artifacts.

## Dependency updates & security

Dependabot version updates are disabled on this archived repository. Continue dependency and CI maintenance in the monorepo (`ksteffe/after-certainty`). Historical CI still includes `npm audit` in `.github/workflows/ci.yml` if this tree is ever rebuilt locally.

## Deployment (Vercel)

1. Connect the repository.
2. Set **NEXT_PUBLIC_SITE_URL** to `https://www.after-certainty.com` in project Environment Variables.
3. Defaults assume Node build (`next build`); output is static-first with prerendered routes.

The podcast RSS URL is `siteConfig.podcastRssUrl` (Anchor). The site **fetches that feed on the server** (`lib/podcast/rss.ts`, cached + **revalidated every hour** via `fetch`); episode lists and the home “latest episode” block use that data. If the feed is unreachable (offline dev, CI, etc.), lists fall back to `data/podcast-episodes.json`. `/feed.xml` still redirects to Anchor for podcast apps.

Explore surfaces (books, patterns, glossary, observatory, questions, trails) load
**`semantic-manifest.json`** from the [after-certainty](https://github.com/ksteffe/after-certainty)
GitHub release (`latest`), with hourly ISR and a bundled fallback at
`data/semantic-manifest.json`. See [`docs/semantic-manifest.md`](docs/semantic-manifest.md)
for remote/fallback provenance, content-type normalization, and
`npm run sync:semantic-manifest` / `validate:fallback` / `validate:public-corpus`.
After each `main` release, CI POSTs to **`/api/cache/revalidate`** with target
**`semantic`** to refresh the graph immediately.

1. Set **`CACHE_REVALIDATE_SECRET`** in Vercel (production) — a long random string.
2. Add the same value as repository secret **`CACHE_REVALIDATE_SECRET`** on `ksteffe/after-certainty` (used by the book export workflow).
3. Optional: set repository variable **`SITE_REVALIDATE_URL`** (default `https://www.after-certainty.com/api/cache/revalidate`).

Example manual refresh:

```bash
curl -sS -X POST "https://www.after-certainty.com/api/cache/revalidate" \
  -H "Authorization: Bearer $CACHE_REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"targets":["semantic"]}'
```

## Design notes

- **Serif display**: Cormorant Garamond (`--font-display-serif`)
- **Sans body**: Source Sans 3 (`--font-sans-body`)
- **Accent**: restrained gold via CSS tokens in `styles/tokens.css`
- Layout primitives: `components/ui/*`, shell in `components/layout/*`

## License

Site content and configuration follow the project policy you adopt for the commons; attribute remixes under **CC BY-SA** where noted in the footer.
