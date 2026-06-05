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
  /** 'newtab' shows the wordmark and a transparent backdrop (the page paints the bg). */
  variant?: 'overlay' | 'newtab'
}

function hostOf(item: CommandItem): string {
  let host = ''
  if (item.action.type === 'open-url') {
    try {
      host = new URL(item.action.url).hostname
    } catch {
      /* not a parseable url */
    }
  }
  if (!host && item.subtitle) host = item.subtitle.split('/')[0]
  return host.replace(/^www\./, '')
}

// Omnibox-style inline completion: if the top result's host (or title) starts with
// what's typed, return the full string so the remainder can render as ghost text.
function getCompletion(query: string, top: CommandItem | undefined): string {
  if (!query || query.startsWith('/') || /\s/.test(query) || !top) return ''
  const lower = query.toLowerCase()
  for (const cand of [hostOf(top), top.title]) {
    if (cand && cand.length > query.length && cand.toLowerCase().startsWith(lower)) {
      return query + cand.slice(query.length) // keep the user's typed casing for the prefix
    }
  }
  return ''
}

// Show the line icon until the favicon actually loads, then swap to it. This is
// robust even where the favicon is blocked (e.g. some sites' CSP in the overlay):
// a blocked image never fires onLoad, so the line icon simply stays. The <img>
// still loads while hidden, so real favicons appear with no broken-image flash.
function ResultIcon({ item }: { item: CommandItem }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      {!loaded && <Icon name={item.iconName} />}
      {item.iconUrl && (
        <img class="cp-favicon" src={item.iconUrl} alt="" hidden={!loaded} onLoad={() => setLoaded(true)} />
      )}
    </>
  )
}

// The shared palette. Pure and surface-agnostic: it knows nothing about whether
// it's the New Tab Page or a content-script overlay. The adapters wire up
// `onExec`/`onClose` and feed it `baseItems`.
export function Palette({
  baseItems,
  onExec,
  onClose,
  autoFocus = true,
  placeholder,
  variant = 'overlay',
}: PaletteProps) {
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
  // Ghost completion only when the default (top) result is the selected one.
  const completion = sel === 0 ? getCompletion(query, results[0]) : ''
  const ghost = completion ? completion.slice(query.length) : ''

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
    } else if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghost) {
      // Accept the inline completion: Tab always; ArrowRight only at the line end.
      const atEnd = inputRef.current?.selectionStart === query.length
      if (e.key === 'Tab' || atEnd) {
        e.preventDefault()
        setQuery(completion)
      }
    }
  }

  return (
    <div class={`cp-root ${variant === 'newtab' ? 'cp-root--newtab' : ''}`} onKeyDown={onKeyDown}>
      <div class="cp-backdrop" onClick={onClose} />
      <div class="cp-panel" role="dialog" aria-modal="true">
        <div class="cp-input-wrap">
          <span class="cp-search">
            <Icon name="search" />
          </span>
          <div class="cp-field">
            <div class="cp-mirror" aria-hidden="true">
              {query}
              <span class="cp-ghost">{ghost}</span>
            </div>
            <input
              ref={inputRef}
              class="cp-input"
              value={query}
              placeholder={placeholder ?? 'Search tabs, history, bookmarks - or try /y, /w, /gh'}
              spellcheck={false}
              autocomplete="off"
              onInput={(e: JSX.TargetedEvent<HTMLInputElement>) => setQuery(e.currentTarget.value)}
            />
          </div>
        </div>
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
            <kbd>tab</kbd> complete
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
      {variant === 'newtab' && <div class="cp-mark">BUSCA</div>}
    </div>
  )
}
