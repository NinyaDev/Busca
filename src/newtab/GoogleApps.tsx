import { useState } from 'preact/hooks'
import { Icon } from '../core/icons'

interface App {
  label: string
  url: string
}

// Plain links - they open in your already-logged-in Google session (Chrome shares
// the cookies). No OAuth, no API keys. This replaces the apps grid Chrome's own
// new tab shows; the real profile photo would need OAuth (a later option).
const APPS: App[] = [
  { label: 'Gmail', url: 'https://mail.google.com' },
  { label: 'Drive', url: 'https://drive.google.com' },
  { label: 'Docs', url: 'https://docs.google.com/document/u/0/' },
  { label: 'Sheets', url: 'https://docs.google.com/spreadsheets/u/0/' },
  { label: 'Slides', url: 'https://docs.google.com/presentation/u/0/' },
  { label: 'Calendar', url: 'https://calendar.google.com' },
  { label: 'Meet', url: 'https://meet.google.com' },
  { label: 'Photos', url: 'https://photos.google.com' },
  { label: 'Maps', url: 'https://maps.google.com' },
]

function favicon(url: string): string {
  const u = new URL(chrome.runtime.getURL('/_favicon/'))
  u.searchParams.set('pageUrl', url)
  u.searchParams.set('size', '32')
  return u.toString()
}

export function GoogleApps() {
  const [open, setOpen] = useState(false)
  return (
    <div class="ga-wrap">
      <button class="ga-btn" title="Google apps" aria-label="Google apps" onClick={() => setOpen((o) => !o)}>
        <Icon name="grid" size={22} />
      </button>
      {open && (
        <>
          <div style="position:fixed;inset:0" onClick={() => setOpen(false)} />
          <div class="ga-grid">
            {APPS.map((a) => (
              <a class="ga-app" key={a.url} href={a.url}>
                <img src={favicon(a.url)} alt="" />
                <span>{a.label}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
