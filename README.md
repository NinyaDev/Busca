<div align="center">

# Busca

**A fast, keyboard-first command palette for Google Chrome.**

Search your tabs, history, and bookmarks, run quick actions, and jump anywhere - without touching the mouse.

![Chrome Web Store - Coming soon](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20soon-aba0c8?logo=googlechrome&logoColor=white)

</div>

---

## Features

One palette, two ways to open it:

| Trigger | What it does |
| --- | --- |
| **Cmd+T / Ctrl+T** | Opens Busca as your new tab page |
| **Cmd+K / Ctrl+K** | Opens Busca as an overlay on any page |

- **Unified fuzzy search** across open tabs, history, and bookmarks - ranked omnibox-style so your most-used result lands first, with inline autocomplete.
- **Paste-to-navigate** - paste a URL and press Enter to go straight there, just like the address bar.
- **Bangs** - type `/` for a picker (`/g` Google, `/y` YouTube, `/w` Wikipedia, `/gh` GitHub, `/so`, `/npm`, `/mdn`, `/ddg`), or add your own.
- **Quick actions** - clear cache (last 24h, or cache + cookies for the current site), reopen the last closed tab, duplicate or mute the current tab, open Chrome pages, a new incognito window, and more.
- **Google apps launcher** on the new tab (Gmail, Drive, Docs, Sheets, Calendar…).
- **Real favicons** on every result and bang.
- **Preferences page** - accent color, the empty-state layout, which tools appear, and custom bangs - synced across your Chrome.

---

## Tech stack

- **[Preact](https://preactjs.com/)** + **@preact/signals** - tiny, fast UI
- **TypeScript**
- **[uFuzzy](https://github.com/leeoniya/uFuzzy)** - fuzzy matching
- Hand-authored CSS rendered in a **Shadow DOM** overlay (host-page styles can't break it), with **Hanken Grotesk** + **Geist Mono** bundled
- **Vite** + **[@crxjs/vite-plugin](https://crxjs.dev/)** - Manifest V3 build
- **chrome.storage.sync** for preferences

---

## Local development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) 18+ and npm

### 2. Clone and install
```bash
git clone https://github.com/NinyaDev/Busca.git
cd Busca
npm install
```

### 3. Build the extension
```bash
npm run build
```
Use `npm run dev` instead for a hot-reloading build while developing.

### 4. Load it in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select the **`dist/`** folder
4. Press **Cmd+T / Ctrl+T** for the new tab, or **Cmd+K / Ctrl+K** on any page

> [!IMPORTANT]
> Load the **`npm run build`** output. The `npm run dev` build streams from a local dev server and stops working once that server is closed.

---

## Project structure

```
src/
  shared/      types, messaging, bangs, quick actions, preferences
  core/        the palette UI - search, ranking, icons, styling
  background/  service worker - builds the search index, runs actions
  newtab/      new-tab adapter (Cmd+T) + Google apps launcher
  content/     overlay adapter (Cmd+K)
  options/     the preferences page
manifest.config.ts
```

It's intentionally simple: one palette component mounted on two surfaces, and one service worker that builds the search index and runs every action.

---

## Privacy

Busca is **100% local**. There is no backend, no analytics, and no telemetry.

- Your tabs, history, and bookmarks are read on-device to power search and **never leave your machine**.
- Favicons come from Chrome's own local cache.
- Preferences are stored with `chrome.storage.sync` - kept on your device and synced through **your own Chrome account**, never to any server we control.
- The only network requests are the ones **you** trigger by opening a result or running a search - i.e. ordinary browsing.

---

## License

[MIT](LICENSE)

---

## Contact

**Adrian Ninanya**

* **GitHub:** [NinyaDev](https://github.com/NinyaDev)
* **LinkedIn:** [Adrian Ninanya](https://www.linkedin.com/in/adrian-ninanya/)
* **Project Link:** [https://github.com/NinyaDev/Busca](https://github.com/NinyaDev/Busca)
