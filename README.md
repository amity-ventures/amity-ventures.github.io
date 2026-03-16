# amity.vc

Static website for Amity Ventures.

## Quick start

```bash
git clone git@github.com:amity-ventures/amity.vc.git
cd amity.vc

# Set up the pre-commit hook (one-time)
git config core.hooksPath .githooks
```

The pre-commit hook requires **Node.js** to be installed. It runs automatically on every commit to keep generated files in sync.

## How content editing works

### The single source of truth: `data/site-content.json`

Almost all site content lives in one file: **`data/site-content.json`**. This is the file you edit when you want to change text, add companies, update team bios, etc.

You _do not_ need to edit the index or skill.md files directly, unless you're editing something not covered by the `site-content.json` file.

It contains:

| Key | What it controls |
|-----|-----------------|
| `homeFeaturedCompanyCount` | How many companies show before the "Show more" button (currently 8) |
| `teamOrder.home` | Display order of team members on the homepage |
| `teamOrder.agent` | Display order of team members in the AI agent view |
| `teamMembers` | All team member data — name, title, bio, photo, education, boards, fun facts, social links |
| `portfolioOrder.human` | Display order of portfolio companies on the homepage |
| `portfolioOrder.agent` | Display order of portfolio companies in the AI agent view |
| `portfolioCompanies` | All company data — name, url, founders, description, image, badge |

**Each team member and company has an ID** (the JSON key, e.g. `"cj"`, `"airbnb"`). These IDs are referenced in the order arrays. When adding a new entry, you must:

1. Add the data object under the appropriate key in `teamMembers` or `portfolioCompanies`
2. Add the ID to the relevant order array(s) — `teamOrder.home`, `portfolioOrder.human`, etc.

Companies can optionally have:
- `agentDescription` — an alternate description shown in agent mode (falls back to `description`)
- `badge` — a label shown next to the company name (e.g. `{"text": "NASDAQ: ABNB", "className": "badge-public"}`)

### How edits become HTML

A build script at **`scripts/sync-site-content.mjs`** reads the JSON and injects generated HTML into `index.html` and `skill.md`. The generated blocks are wrapped in markers like:

```html
<!-- GENERATED: human-portfolio:start -->
...generated content...
<!-- GENERATED: human-portfolio:end -->
```

**You never need to run this script manually.** The pre-commit hook (`.githooks/pre-commit`) runs it automatically before every commit. If the JSON changes produce different HTML, the hook stages the updated `index.html` and `skill.md` for you.

The script also validates the JSON — it will error if:
- An ID in an order array doesn't exist in the data
- There are duplicate IDs in an order array
- `homeFeaturedCompanyCount` is out of range

### To run the sync manually (optional)

```bash
node scripts/sync-site-content.mjs
```

## What to edit

| To change... | Edit this |
|-------------|-----------|
| Team bios, photos, boards, fun facts | `data/site-content.json` → `teamMembers` |
| Portfolio companies | `data/site-content.json` → `portfolioCompanies` |
| Display order of team/companies | `data/site-content.json` → `teamOrder` / `portfolioOrder` |
| Number of featured companies | `data/site-content.json` → `homeFeaturedCompanyCount` |
| Visual design, layout, animations | `styles.css` and `team.css` |
| Hero section, nav, approach text, footer, testimonials | `index.html` (the non-generated parts) |
| Privacy policy | `privacy-policy.html` |
| Amity Reserve page | `reserve.html` |
| 404 page / redirect logic | `404.html` |
| AI agent profile | `skill.md` (non-generated parts) |

## What NOT to edit by hand

Do not manually edit the blocks between `GENERATED` markers in `index.html` or `skill.md`. These are overwritten by the sync script on every commit. Your changes will be lost.

The generated blocks are:
- `human-portfolio` — the portfolio company grid
- `team-home-list` — team member buttons
- `agent-team-list` — agent view team table
- `agent-portfolio-list` — agent view portfolio list
- `home-member-data` — the JavaScript object containing team data for the modal

## Adding images

Team photos go in `assets/images/` (e.g. `assets/images/lastname.jpg`).
Company logos go in `assets/images/` as well.
Reference the path in `site-content.json` relative to the repo root.

## Redirects from the previous site

The old site had different URL routes. These are preserved via two mechanisms:

### 1. Directory-based redirects

Small HTML files that do an instant `meta http-equiv="refresh"` + JS redirect:

| Old URL | Redirects to | File |
|---------|-------------|------|
| `/team` | `/#team` | `team/index.html` |
| `/team/cj-reim` | `/#team` | `team/cj-reim/index.html` |
| `/team/patrick-yang` | `/#team` | `team/patrick-yang/index.html` |
| `/team/andy-bromberg` | `/#team` | `team/andy-bromberg/index.html` |
| `/team/andy-ravreby` | `/#team` | `team/andy-ravreby/index.html` |
| `/team/kieran-dennis` | `/#team` | `team/kieran-dennis/index.html` |
| `/team/peter-bell` | `/#team` | `team/peter-bell/index.html` |
| `/team/christina-dong` | `/#team` | `team/christina-dong/index.html` |
| `/team/colleen-johnson` | `/#team` | `team/colleen-johnson/index.html` |
| `/team/jason-wong` | `/#team` | `team/jason-wong/index.html` |
| `/portfolio` | `/#companies` | `portfolio/index.html` |
| `/privacy-policy` | `/privacy-policy.html` | `privacy-policy/index.html` |
| `/reserve` | `/reserve.html` | `reserve/index.html` |
| `/amity-reserve` | `/reserve.html` | `amity-reserve/index.html` |

### 2. 404.html fallback redirects

If a directory redirect doesn't catch the URL, the `404.html` page has JavaScript that maps old paths:

```
/portfolio      → /#companies
/team           → /#team
/team/*         → /#team
/privacy-policy → /privacy-policy.html
/amity-reserve  → /reserve.html
/reserve        → /reserve.html
/skill.md       → /skill.md
```

This provides a double safety net — the directory files handle most cases, and 404.html catches anything that slips through (depending on how the hosting platform serves 404s).

## Site structure

```
.
├── index.html              Main page (hero, portfolio, team, approach, footer)
├── privacy-policy.html     Privacy policy (standalone)
├── reserve.html            Amity Reserve page (standalone)
├── 404.html                Not-found page with redirect logic
├── styles.css              Main stylesheet
├── team.css                Team modal/grid styles
├── skill.md                Machine-readable profile for AI agents
├── data/
│   └── site-content.json   Content database
├── scripts/
│   └── sync-site-content.mjs  JSON → HTML sync script
├── assets/
│   ├── images/             Team photos and company logos
│   └── favicon/            Favicon files
├── .githooks/
│   └── pre-commit          Auto-sync hook
├── team/                   Redirect stubs for old /team/* URLs
├── portfolio/              Redirect stub for old /portfolio URL
├── reserve/                Redirect stub for old /reserve URL
├── amity-reserve/          Redirect stub for old /amity-reserve URL
└── privacy-policy/         Redirect stub for old /privacy-policy URL
```

## Notable features

**Dual-mode UI** — The site has a human view and an "agent" view (toggled via button or `#agent` hash). Agent mode shows content in a tabular, machine-readable format. The `skill.md` file is the fully machine-readable version.

**Time-of-day hero** — The hero background video has Dawn/Day/Dusk/Night filter presets, selectable from the nav. Persists in localStorage.

**Scroll animations** — Elements with `data-reveal` attributes animate in via `IntersectionObserver` when scrolled into view.

**No dependencies** — The site has zero runtime dependencies. The only tooling is the Node.js sync script.
