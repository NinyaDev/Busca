import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { Palette } from '../core/Palette'
import type { ActionDescriptor, CommandItem } from '../shared/types'
import { sendMessage } from '../shared/messaging'
import '@fontsource-variable/hanken-grotesk'
import '@fontsource-variable/geist-mono'
import '../core/palette.css'

// --- New Tab Page auto-focus workaround ---
// Chrome (since v27) parks keyboard focus in the omnibox on a fresh new-tab load
// and ignores the page's focus() calls. Reloading once with a query string makes
// the next load "not fresh", so our input can take focus. The blink is minimal.
// (Toggle to first-keystroke focus instead by removing this block - see README.)
if (!location.search.includes('focus')) {
  location.search = '?focus'
}

function exec(action: ActionDescriptor, opts: { newTab: boolean }) {
  void sendMessage({ type: 'EXEC', descriptor: action, newTab: opts.newTab })
}

function App() {
  const [items, setItems] = useState<CommandItem[]>([])

  // Render the shell instantly; fill results when the snapshot arrives.
  useEffect(() => {
    sendMessage({ type: 'GET_SNAPSHOT' })
      .then((r) => {
        if (r && (r as { type?: string }).type === 'SNAPSHOT') setItems((r as { items: CommandItem[] }).items)
      })
      .catch(() => {})
  }, [])

  return (
    <Palette
      baseItems={items}
      autoFocus
      variant="newtab"
      onExec={exec}
      // On the NTP the palette *is* the page; closing just refocuses the input.
      onClose={() => document.querySelector<HTMLInputElement>('.cp-input')?.focus()}
    />
  )
}

render(<App />, document.getElementById('app')!)
