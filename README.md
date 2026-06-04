# Command Palette for Chrome

A fast, keyboard-first command palette for Chrome - Raycast/Spotlight for the browser, with a developer bent. Built on the **hybrid trigger strategy**:

- **Cmd+T / Ctrl+T** → opens the palette as the **New Tab Page** (we override the NTP; Chrome reserves Cmd+T so this is the only sanctioned way to land it there).
- **Cmd+K / Ctrl+K** → opens the **same palette as an overlay** on whatever page you're on (Shadow-DOM isolated, blurs the live page behind it).

> Why not bind Cmd+T directly? Chrome treats Cmd+T as a reserved "new tab" accelerator - it can't be captured by `chrome.commands`, the shortcuts UI, or a content-script `keydown`. We don't fight it; we own the page that Cmd+T already opens.

## Stack

Preact + `@preact/signals` · hand-authored CSS (adopted stylesheet, px units) · Tailwind (wired up for future settings UI) · [uFuzzy](https://github.com/leeoniya/uFuzzy) for matching · Vite + `@crxjs/vite-plugin` (MV3) · TypeScript.

## Getting started

```bash
npm install
npm run dev      # development build with HMR, writes to dist/
# (or) npm run build   # production build
```

Then load it in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select the **`dist/`** folder
4. Open a new tab (**Cmd+T**) → the palette is your new tab page
5. On any normal web page, press **Cmd+K / Ctrl+K** → the overlay appears

> After the first `npm run dev`, keep it running; @crxjs reloads the extension on change. If you hard-edit the manifest, click the refresh icon on the extension card.

## Architecture

One palette **core**, two thin **adapters** - the core never knows which surface it's on.

```
src/
  shared/          # contracts shared by every context
    types.ts         CommandItem + ActionDescriptor (the universal result shape)
    messaging.ts     typed runtime messages
    bangs.ts         default bang registry (/y /w /gh …) + parser
    actions.ts       quick-action metadata (clear cache, duplicate tab, …)
  core/            # the shared, surface-agnostic palette
    Palette.tsx      the component (input, list, keyboard nav, confirm-on-danger)
    search.ts        uFuzzy matching + score blend
    items.ts         builds bang/web-search/action items + final result list
    palette.css      the look (adopted into the overlay's shadow root)
  background/      # the privileged service worker
    index.ts         Cmd+K command handler + message router
    snapshot.ts      builds tabs+history+bookmarks item pool
    exec.ts          THE single action executor (open url, switch tab, quick actions)
  newtab/          # Cmd+T adapter - palette as the New Tab Page
    index.html, main.tsx
  content/         # Cmd+K adapter - palette as a Shadow-DOM overlay
    index.ts         host + signals + toggle plumbing (no JSX)
    mount.tsx        renders Palette into the shadow root
manifest.config.ts # MV3 manifest (permissions justified inline)
```

**Execution model.** Everything in the list is a `CommandItem` with a serializable `action`. On Enter, both adapters send that action to the service worker's single `execAction` - so "switch tab", "clear cache", "open url" live in exactly one place. Cmd/Ctrl+Enter forces "open in new tab".

## What works today (P0)

- Hybrid trigger (NTP + Cmd+K overlay), same component on both
- Unified fuzzy search across **open tabs · history · bookmarks** (deduped, badged, recency-boosted)
- **Bangs**: `/y` `/w` `/g` `/gh` `/so` `/npm` `/mdn` `/ddg` (bare form works too, e.g. `y cats`)
- Web-search fallback for any query
- **Quick actions**: duplicate tab, **clear cache (last 24h)**, clear cache+cookies for this site, reopen last closed, mute/unmute, open chrome:// pages, new incognito - destructive ones require a confirm press

## Roadmap (deferred, by design)

- **P1 - perf & freshness:** cache the snapshot in the service worker + persist to **IndexedDB**, refresh incrementally via `tabs/history/bookmarks` events (today it rebuilds per open - fast, but not yet restart-cached). Match-highlighting of matched characters. rem→px PostCSS transform if/when we use Tailwind utilities inside the overlay. Learned-pick frecency boost.
- **P1 - clipboard actions:** copy URL / copy as Markdown / copy as curl (need page-context clipboard, not the SW).
- **P2 - developer features:** localhost/dev-server radar (port detection), clipboard-aware smart paste (JWT/JSON/PR jumps), project sessions + environment switcher, user-editable bangs & bang packs, settings UI.

## Known limitations (Chrome constraints, not bugs)

- The NTP palette can't overlay an *existing* page (that's what Cmd+K is for); it doesn't run in incognito; only one extension can own the new tab page.
- The overlay can't inject on `chrome://`, the Web Store, or the PDF viewer - there, Cmd+K falls back to opening a new-tab palette.
- Favicons render reliably on the NTP; inside the overlay some sites' CSP may block the `_favicon` image (it degrades to a glyph). P1 will address this.

## Still needed from you

- **Brand + icons:** name is currently "Command Palette". Provide 16/48/128px PNG icons (or approve generated placeholders) to add to the manifest `icons`/`action.default_icon`.
- **Auto-focus preference:** the NTP uses the `?focus` reload trick (tiny blink). Say the word if you'd rather use first-keystroke focus (no blink, one extra key).
- Nothing else is blocking: **no Google Cloud Console / OAuth and no API keys** are required for this feature set.
