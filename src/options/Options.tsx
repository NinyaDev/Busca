import { useEffect, useState } from 'preact/hooks'
import { ACCENTS, loadPrefs, savePrefs, type Prefs } from '../shared/prefs'
import { QUICK_ACTIONS } from '../shared/actions'
import type { Bang } from '../shared/bangs'

// Busca preferences. Reads/writes chrome.storage.sync; every change saves
// immediately and the open palettes pick it up via onPrefsChanged.
export function Options() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [draft, setDraft] = useState<Bang>({ token: '', label: '', url: '' })

  useEffect(() => {
    loadPrefs().then(setPrefs)
  }, [])

  // Recolor the whole preferences page to the selected accent (live).
  useEffect(() => {
    if (prefs) {
      const a = ACCENTS[prefs.accent] ?? ACCENTS.lavender
      document.documentElement.style.setProperty('--op-accent', a.accent)
    }
  }, [prefs?.accent])

  if (!prefs) return null
  const p = prefs

  function update(patch: Partial<Prefs>) {
    const next = { ...p, ...patch }
    setPrefs(next)
    void savePrefs(next)
  }

  function toggleTool(id: string) {
    const has = p.emptyTools.includes(id)
    update({ emptyTools: has ? p.emptyTools.filter((t) => t !== id) : [...p.emptyTools, id] })
  }

  function addBang() {
    const token = draft.token.trim().toLowerCase()
    const url = draft.url.trim()
    const label = draft.label.trim() || token
    if (!token || !url.includes('%s')) return
    update({ customBangs: [...p.customBangs.filter((b) => b.token !== token), { token, label, url }] })
    setDraft({ token: '', label: '', url: '' })
  }

  return (
    <div class="op">
      <header class="op-head">
        <span class="op-mark">BUSCA</span>
        <span class="op-sub">preferences</span>
      </header>

      <section class="op-sec">
        <h2>Accent</h2>
        <div class="op-swatches">
          {Object.entries(ACCENTS).map(([id, a]) => (
            <button
              key={id}
              class={`op-swatch ${p.accent === id ? 'op-swatch--on' : ''}`}
              onClick={() => update({ accent: id })}
            >
              <span class="op-dot" style={`background:${a.accent}`} />
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <section class="op-sec">
        <h2>New tab</h2>
        <label class="op-row">
          <input
            type="checkbox"
            checked={p.showGoogleApps}
            onChange={(e) => update({ showGoogleApps: e.currentTarget.checked })}
          />
          Show the Google apps button (top-right)
        </label>
      </section>

      <section class="op-sec">
        <h2>Empty palette</h2>
        <label class="op-row">
          Most-used sites to show:&nbsp;
          <input
            type="range"
            min="0"
            max="8"
            value={p.recentsCount}
            onInput={(e) => update({ recentsCount: Number(e.currentTarget.value) })}
          />
          <span class="op-num">{p.recentsCount}</span>
        </label>
        <p class="op-hint">Tools shown in the empty palette (all stay searchable anytime):</p>
        <div class="op-tools">
          {QUICK_ACTIONS.map((a) => (
            <label key={a.id} class="op-row">
              <input type="checkbox" checked={p.emptyTools.includes(a.id)} onChange={() => toggleTool(a.id)} />
              {a.title}
            </label>
          ))}
        </div>
      </section>

      <section class="op-sec">
        <h2>Custom bangs</h2>
        <p class="op-hint">
          Put <code>%s</code> where the query goes - e.g. <code>https://reddit.com/search?q=%s</code>
        </p>
        {p.customBangs.length > 0 && (
          <div class="op-banglist">
            {p.customBangs.map((b) => (
              <div class="op-bang" key={b.token}>
                <span class="op-tok">/{b.token}</span>
                <span class="op-lbl">{b.label}</span>
                <span class="op-url">{b.url}</span>
                <button class="op-x" onClick={() => update({ customBangs: p.customBangs.filter((x) => x.token !== b.token) })}>
                  remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div class="op-add">
          <input
            placeholder="token (r)"
            value={draft.token}
            onInput={(e) => setDraft({ ...draft, token: e.currentTarget.value })}
          />
          <input
            placeholder="label (Reddit)"
            value={draft.label}
            onInput={(e) => setDraft({ ...draft, label: e.currentTarget.value })}
          />
          <input
            placeholder="https://reddit.com/search?q=%s"
            value={draft.url}
            onInput={(e) => setDraft({ ...draft, url: e.currentTarget.value })}
          />
          <button onClick={addBang}>Add</button>
        </div>
      </section>
    </div>
  )
}
