import { render } from 'preact'
import { useEffect } from 'preact/hooks'
import type { Signal } from '@preact/signals'
import { Palette } from '../core/Palette'
import type { ActionDescriptor, CommandItem } from '../shared/types'

export interface MountOpts {
  open: Signal<boolean>
  items: Signal<CommandItem[]>
  host: HTMLElement
  onExec: (action: ActionDescriptor, opts: { newTab: boolean }) => void
  onClose: () => void
}

// Renders the palette into the shadow root once. It reads the `open`/`items`
// signals, so flipping `open.value` shows/hides it without a re-render from the
// content script. While hidden the host ignores pointer events so the page stays
// fully interactive.
export function mountInto(shadow: ShadowRoot, o: MountOpts) {
  function Root() {
    const isOpen = o.open.value
    useEffect(() => {
      o.host.style.pointerEvents = isOpen ? 'auto' : 'none'
    }, [isOpen])
    if (!isOpen) return null
    return <Palette baseItems={o.items.value} autoFocus onExec={o.onExec} onClose={o.onClose} />
  }
  render(<Root />, shadow)
}
