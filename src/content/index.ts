import { signal } from '@preact/signals'
import type { ActionDescriptor, CommandItem } from '../shared/types'
import { sendMessage } from '../shared/messaging'
import { mountInto } from './mount'
// `?inline` gives us the compiled CSS as a string so we can adopt it into the
// shadow root (no <style> injection into the host page).
import paletteCss from '../core/palette.css?inline'
import '@fontsource-variable/hanken-grotesk'
import '@fontsource-variable/geist-mono'

const open = signal(false)
const items = signal<CommandItem[]>([])

let host: HTMLElement | null = null

// Pre-mount a hidden Shadow-DOM overlay at content-script load. Opening later is
// just flipping a signal - the expensive setup (shadow attach, stylesheet parse,
// Preact mount) is already paid for, which is what keeps the open near-instant.
function ensureHost() {
  if (host) return
  host = document.createElement('div')
  host.id = 'command-palette-host'
  // `all: initial` blocks inherited host-page styles; the rest establishes a
  // full-viewport, top-most, click-through-until-open layer.
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;'

  const shadow = host.attachShadow({ mode: 'open' })
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(paletteCss)
  shadow.adoptedStyleSheets = [sheet]

  document.documentElement.appendChild(host)

  mountInto(shadow, {
    open,
    items,
    host,
    onExec: (action: ActionDescriptor, opts) => {
      void sendMessage({ type: 'EXEC', descriptor: action, newTab: opts.newTab })
      closeOverlay()
    },
    onClose: closeOverlay,
  })
}

async function refreshItems() {
  try {
    const r = await sendMessage({ type: 'GET_SNAPSHOT' })
    if (r && (r as { type?: string }).type === 'SNAPSHOT') items.value = (r as { items: CommandItem[] }).items
  } catch {
    /* service worker asleep or unreachable; palette still opens with empty list */
  }
}

function openOverlay() {
  ensureHost()
  open.value = true
  void refreshItems() // show instantly, fill when the snapshot arrives
}

function closeOverlay() {
  open.value = false
}

function toggleOverlay() {
  open.value ? closeOverlay() : openOverlay()
}

chrome.runtime.onMessage.addListener((msg: { type?: string }) => {
  if (msg?.type === 'TOGGLE_OVERLAY') toggleOverlay()
})

ensureHost()
// Warm the snapshot now so the first Cmd+K already shows your most-used sites
// (same empty state as the new tab) instead of flashing a tools-only list.
void refreshItems()
