import type { ActionDescriptor } from '../shared/types'

const DAY_MS = 1000 * 60 * 60 * 24

export interface ExecContext {
  newTab?: boolean
  /** The tab the request came from (NTP tab or the overlay's host tab). */
  senderTabId?: number
}

// The single privileged executor. Both surfaces (NTP page + overlay) send their
// action descriptors here so the logic lives in exactly one place.
export async function execAction(d: ActionDescriptor, ctx: ExecContext): Promise<void> {
  switch (d.type) {
    case 'open-url': {
      const where = ctx.newTab ? 'newtab' : d.where ?? 'current'
      if (where === 'newtab' || ctx.senderTabId == null) {
        await chrome.tabs.create({ url: d.url })
      } else {
        await chrome.tabs.update(ctx.senderTabId, { url: d.url })
      }
      return
    }
    case 'switch-tab': {
      await chrome.tabs.update(d.tabId, { active: true })
      await chrome.windows.update(d.windowId, { focused: true })
      return
    }
    case 'quick-action':
      return runQuickAction(d.actionId, ctx.senderTabId)
  }
}

async function runQuickAction(actionId: string, senderTabId?: number): Promise<void> {
  switch (actionId) {
    case 'duplicate-tab':
      if (senderTabId != null) await chrome.tabs.duplicate(senderTabId)
      return

    case 'clear-cache-24h':
      // Scoped to the last 24h, cache only — never a blanket wipe.
      await chrome.browsingData.remove({ since: Date.now() - DAY_MS }, { cache: true, cacheStorage: true })
      return

    case 'clear-site-data': {
      const origin = await originOfTab(senderTabId)
      if (!origin) return
      await chrome.browsingData.remove(
        { origins: [origin] },
        { cache: true, cacheStorage: true, cookies: true, localStorage: true, indexedDB: true, serviceWorkers: true },
      )
      return
    }

    case 'reopen-closed':
      await chrome.sessions.restore()
      return

    case 'toggle-mute':
      if (senderTabId != null) {
        const tab = await chrome.tabs.get(senderTabId)
        await chrome.tabs.update(senderTabId, { muted: !tab.mutedInfo?.muted })
      }
      return

    case 'open-extensions':
      await chrome.tabs.create({ url: 'chrome://extensions' })
      return
    case 'open-settings':
      await chrome.tabs.create({ url: 'chrome://settings' })
      return
    case 'open-history':
      await chrome.tabs.create({ url: 'chrome://history' })
      return
    case 'open-downloads':
      await chrome.tabs.create({ url: 'chrome://downloads' })
      return
    case 'new-incognito':
      await chrome.windows.create({ incognito: true })
      return
  }
}

async function originOfTab(tabId?: number): Promise<string | null> {
  if (tabId == null) return null
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab.url) return null
    return new URL(tab.url).origin
  } catch {
    return null
  }
}
