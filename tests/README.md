# Testing

Playwright end-to-end tests covering layout, touch input, accessibility, and the
WhatsApp contact flow.

## First run

```bash
npm install
npx playwright install chromium   # one-time, ~200 MB
npx playwright install webkit     # optional: enables the iPhone profile
npm test
```

The config builds the site and starts a static preview automatically, so
`npm test` is all you need.

## Current status

```
297 passed   across all five profiles, 0 failures
 18 skipped  touch-only specs that don't apply to a non-touch desktop profile
```

Chromium and WebKit are both installed, so `phone-webkit` runs for real — that's
the engine a future iOS build would use.

Three real bugs were found and fixed while writing these tests:

| Bug | Fix |
|---|---|
| Project cards overflowed at 320px — `minmax(300px, 1fr)` is wider than the 240px left by the 40px gutters | `minmax(min(300px, 100%), 1fr)` in `Projects.module.css` and `About.module.css` |
| Mobile nav links were only ~21px tall — well under a comfortable touch target | `min-height: 44px` on `.nav a` in `Header.module.css` |
| The About panel carried the same latent `minmax` overflow risk | same `min()` guard |

Three more failures were the *tests* being wrong, which is worth knowing about
because each pointed at a real trap:

- Asserting `#contact` scrolls to `top: 0` — it's the last block, so the page
  hits its scroll limit. Asserts "in the viewport" instead.
- `mouse.wheel()` to simulate a swipe — a no-op under mobile emulation. Asserts
  real scrollability instead.
- Reading `scrollY` right after `scrollTo()` — the site uses
  `scroll-behavior: smooth`, so the read raced the animation. Chromium was fast
  enough to pass, WebKit wasn't. Now uses `behavior: "instant"`.

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Everything, all 5 device profiles |
| `npm run test:desktop` | Desktop Chrome only (1440 + 1920) |
| `npm run test:mobile` | Phone + tablet profiles |
| `npm run test:ui` | Playwright UI mode — step through tests live |
| `npm run test:report` | Open the last HTML report |

Useful extras:

```bash
npx playwright test --grep "WhatsApp"     # one suite
npx playwright test --headed              # watch it run
npx playwright test tests/responsive.spec.ts
npx playwright test --project=phone-webkit # one device
```

## Device profiles

Defined in `playwright.config.ts`:

| Project | Device | Viewport | Touch |
|---|---|---|---|
| `desktop-chrome` | Desktop Chrome | 1440×900 | no |
| `desktop-wide` | Desktop Chrome | 1920×1080 | no |
| `tablet-chrome` | Desktop Chrome | 820×1180 | **yes** |
| `phone-chrome` | Pixel 7 | device | **yes** |
| `phone-webkit` | iPhone 13 | device | **yes** |

`phone-webkit` uses WebKit, so Safari/iOS behaviour is covered too — including how
it handles touch scrolling and viewport units differently from Chromium.

> Only Chromium is installed. To also run `phone-webkit` locally you need
> `npx playwright install webkit`.

## What is covered

**`smoke.spec.ts` — does it work at all**
- Title, meta description, portrait actually decodes
- All five sections present and non-empty
- Site content matches `content/site.ts`
- The three mockup fonts really apply (Cormorant / Source Sans / Plex Mono)
- No horizontal overflow
- No broken images, no failed requests, no console errors

**`responsive.spec.ts` — layout and touch**
- No horizontal overflow at **13 widths** from 320px to 2560px
- Content reflows instead of scrolling sideways
- Portrait stays inside its frame at every width
- Hero stacks on phones, sits side-by-side on desktop
- Project grid collapses to one column on a phone
- Long text wraps instead of clipping
- *Touch (skipped on desktop):* context reports touch, tapping nav scrolls correctly,
  the WhatsApp badge is tappable, tap targets are big enough, the page scrolls, and
  nothing depends on hover alone
- Viewport isn't zoom-locked; 200% text zoom causes no overflow

**`whatsapp.spec.ts` — contact flow**
- No form, no message inputs anywhere
- Every `wa.me` link uses `923288304524` correctly
- Number is never malformed (no `+`, no spaces)
- Human-readable `+92 328 8304524` is displayed
- The green icon is `#25D366`, circular, and first in the contact block
- Links open in a new tab with `rel="noopener"`
- Prefilled messages are non-empty and name the right repo

**`content.spec.ts` — content and navigation**
- Private section is distinct, every card badged "Private"
- **No private repo URL is ever exposed**
- Each private card opens WhatsApp with a per-repo access request
- Public projects still link to real repos
- Every `#anchor` resolves; nav links scroll to their sections
- Brand link returns to top; external links use `rel="noopener"`

**`a11y-design.spec.ts` — accessibility and fidelity**
- Landmarks present, exactly one `h1`, no skipped heading levels
- All images have `alt`; icon-only links have accessible names
- Focus is visible; keyboard can reach the WhatsApp badge
- Body text meets **WCAG AA** contrast (computed from real rendered colours)
- Palette and component metrics match the mockup exactly
- Page isn't absurdly heavy; no third-party requests

## Notes

- Tests run against **`out/`** (the production export), not the dev server — it's the
  artefact that gets deployed, and it avoids dev-only noise.
- `reuseExistingServer` is on locally so you can keep `npm run preview` running.
- Failures save a trace and a screenshot into `test-results/`.
- The contrast test reads computed styles from the live page, so it catches real
  regressions rather than checking a hard-coded palette.