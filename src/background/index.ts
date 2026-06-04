import type { Message } from '../shared/messaging'
import { buildSnapshot } from './snapshot'
import { execAction } from './exec'

// Pages where a content script can't run, so the overlay can't appear. On these
// we fall back to opening a fresh tab (which IS our palette via the NTP override).
function isInjectable(url?: string): boolean {
  if (!url) return false
  return /^https?:\/\//i.test(url) && !/^https:\/\/chromewebstore\.google\.com/i.test(url)
}

// Cmd/Ctrl+K -> toggle the overlay on the active tab. (Cmd+T is handled entirely
// by the New Tab Page override and never reaches here - Chrome reserves it.)
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-overlay') return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return

  if (!isInjectable(tab.url)) {
    await chrome.tabs.create({}) // opens the NTP palette as a fallback
    return
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' })
  } catch {
    // Content script isn't present (page predates install/update). Inject it,
    // then toggle. Falls back to a new tab if even that fails.
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content/index.ts'] })
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' })
    } catch {
      await chrome.tabs.create({})
    }
  }
})

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  ;(async () => {
    try {
      if (msg.type === 'GET_SNAPSHOT') {
        const items = await buildSnapshot()
        sendResponse({ type: 'SNAPSHOT', items })
      } else if (msg.type === 'EXEC') {
        await execAction(msg.descriptor, { newTab: msg.newTab, senderTabId: sender.tab?.id })
        sendResponse({ type: 'EXEC_RESULT', ok: true })
      }
    } catch (e) {
      sendResponse({ type: 'EXEC_RESULT', ok: false, error: String(e) })
    }
  })()
  return true // keep the message channel open for the async response
})
