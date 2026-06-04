import type { JSX } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { CommandItem, ActionDescriptor } from '../shared/types'
import { searchItems } from './search'
import { buildActionItems, buildResults } from './items'
import { Icon } from './icons'

export interface PaletteProps {
  /** Tabs/history/bookmarks snapshot from the service worker. */
  baseItems: CommandItem[]
  /** Run an action. `newTab` is set when the user holds Cmd/Ctrl on Enter. */
  onExec: (action: ActionDescriptor, opts: { newTab: boolean }) => void
  /** Dismiss the palette (Esc / backdrop click / after exec). */
  onClose: () => void
  autoFocus?: boolean
  placeholder?: string
}

// Favicon when we have one, falling back to the line icon if it fails to load
// (some sites' CSP can block the _favicon image inside the overlay).
function ResultIcon({ item }: { item: CommandItem }) {
  const [broken, setBroken] = useState(false)
  if (item.iconUrl && !broken) {
    return <img class="cp-favicon" src={item.iconUrl} alt="" onError={() => setBroken(true)} />
  }
  return <Icon name={item.iconName} />
}

// The shared palette. Pure and surface-agnostic: it knows nothing about whether
// it's the New Tab Page or a content-script overlay. The adapters wire up
// `onExec`/`onClose` and feed it `baseItems`.
export function Palette({ baseItems, onExec, onClose, autoFocus = true, placeholder }: PaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const actionItems = useMemo(() => buildActionItems(), [])
  const results = useMemo(
    () => buildResults(query, baseItems, actionItems, searchItems),
    [query, baseItems, actionItems],
  )

  const sel = Math.min(selected, Math.max(0, results.length - 1))

  useEffect(() => {
    setSelected(0)
    setConfirmId(null)
  }, [query])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-sel="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  function exec(item: CommandItem, newTab: boolean) {
    // Destructive actions ask for one confirmation press before running.
    if (item.badges?.includes('danger') && confirmId !== item.id) {
      setConfirmId(item.id)
      return
    }
    onExec(item.action, { newTab })
    onClose()
  }

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[sel]
      if (item) exec(item, e.metaKey || e.ctrlKey)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div class="cp-root" onKeyDown={onKeyDown}>
      <div class="cp-backdrop" onClick={onClose} />
      <div class="cp-panel" role="dialog" aria-modal="true">
        <input
          ref={inputRef}
          class="cp-input"
          value={query}
          placeholder={placeholder ?? 'Search tabs, history, bookmarks - or try /y, /w, /gh…'}
          spellcheck={false}
          autocomplete="off"
          onInput={(e: JSX.TargetedEvent<HTMLInputElement>) => setQuery(e.currentTarget.value)}
        />
        <div class="cp-list" ref={listRef}>
          {results.length === 0 && <div class="cp-empty">No results</div>}
          {results.map((it, i) => (
            <div
              key={it.id}
              data-sel={i === sel}
              class={`cp-row ${i === sel ? 'cp-row--sel' : ''} ${it.badges?.includes('danger') ? 'cp-row--danger' : ''}`}
              onMouseMove={() => setSelected(i)}
              onClick={(e: JSX.TargetedMouseEvent<HTMLDivElement>) => exec(it, e.metaKey || e.ctrlKey)}
            >
              <span class="cp-icon">
                <ResultIcon item={it} />
              </span>
              <span class="cp-rowtext">
                <span class="cp-title">{it.title}</span>
                {it.subtitle && <span class="cp-subtitle">{it.subtitle}</span>}
              </span>
              {confirmId === it.id ? (
                <span class="cp-confirm">Press again to confirm</span>
              ) : (
                it.badges
                  ?.filter((b) => b !== 'danger')
                  .map((b) => (
                    <span key={b} class="cp-badge">
                      {b}
                    </span>
                  ))
              )}
              <span class="cp-kind">{it.kind}</span>
            </div>
          ))}
        </div>
        <div class="cp-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>⌘</kbd>
            <kbd>↵</kbd> new tab
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
