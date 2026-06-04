import type { CommandItem, ActionDescriptor } from './types'

// Messages the UI surfaces (NTP page + content overlay) send to the service worker.
export type Message =
  | { type: 'GET_SNAPSHOT' }
  | { type: 'EXEC'; descriptor: ActionDescriptor; newTab?: boolean }
  // Sent service-worker -> content script to toggle the overlay (from Cmd/Ctrl+K).
  | { type: 'TOGGLE_OVERLAY' }

export type Response =
  | { type: 'SNAPSHOT'; items: CommandItem[] }
  | { type: 'EXEC_RESULT'; ok: boolean; error?: string }

/** Promise wrapper around chrome.runtime.sendMessage with our typed contract. */
export function sendMessage<T = Response>(msg: Message): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>
}
