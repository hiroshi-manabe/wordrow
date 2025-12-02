import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import TextImportPanel from '../components/TextImportPanel'
import type { TextRecord } from '../storage/db'
import { db } from '../storage/db'
import { useSettingsStore } from '../features/settings/store'
import type { InputMode } from '../features/settings/types'
import { deleteTextById } from '../storage/delete-text'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function LibraryRoute() {
  const texts = useLiveQuery(() => db.texts.orderBy('updatedAt').reverse().toArray(), [])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <div className="library-grid">
      <section className="section-card">
        <header className="section-header library-header">
          <div>
            <p className="eyebrow">Library</p>
            <h2>Your texts</h2>
          </div>
          <div className="library-actions">
            <button type="button" className="ghost-button" onClick={() => setInfoOpen((v) => !v)}>
              {infoOpen ? 'Hide info' : 'Import info'}
            </button>
            <button type="button" className="primary-button" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
          </div>
        </header>
        {infoOpen ? (
          <div className="library-info muted">
            <p>
              Import a text to begin practicing word-order recall. Each line becomes a sentence and
              stays deterministic thanks to per-sentence seeds.
            </p>
            <p>
              Title on line 1, optional <code>lang=&lt;tag&gt;</code> on line 2, sentences after that.
              We store everything locally in your browser (Dexie).
            </p>
          </div>
        ) : null}
        {renderLibraryContents(texts)}
      </section>
      <TextImportPanel />
      {settingsOpen ? <SettingsModal onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  )
}

function renderLibraryContents(texts: TextRecord[] | undefined) {
  if (!texts) {
    return <p className="muted">Loading texts…</p>
  }

  if (!texts.length) {
    return <p className="muted">Import a UTF-8 .txt file to see it listed here.</p>
  }

  return (
    <ul className="text-list">
      {texts.map((text) => (
        <li key={text.id} className="text-card">
          <div>
            <p className="text-card__title">{text.title}</p>
            <p className="text-card__meta">
              {text.sentencesCount} sentences · lang={text.langFull}
            </p>
            <p className="text-card__meta">Updated {dateFormatter.format(new Date(text.updatedAt))}</p>
          </div>
          <div className="text-card__actions">
            <Link to={`/play/${text.id}`} className="primary-button text-card__button">
              Play
            </Link>
            <Link to={`/stats/${text.id}`} className="ghost-button text-card__button">
              Stats
            </Link>
            <DeleteButton textId={text.id} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const inputMode = useSettingsStore((state) => state.inputMode)
  const setInputMode = useSettingsStore((state) => state.setInputMode)

  const handleChange = (mode: InputMode) => {
    setInputMode(mode)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <h3>Settings</h3>
        <div className="settings-options">
          <label>
            <input
              type="radio"
              name="input-mode"
              checked={inputMode === 'both'}
              onChange={() => handleChange('both')}
            />
            Both hands (alternating rows)
          </label>
          <label>
            <input
              type="radio"
              name="input-mode"
              checked={inputMode === 'left'}
              onChange={() => handleChange('left')}
            />
            Left hand only (ASDF)
          </label>
          <label>
            <input
              type="radio"
              name="input-mode"
              checked={inputMode === 'right'}
              onChange={() => handleChange('right')}
            />
            Right hand only (JKL;)
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteButton({ textId }: { textId: string }) {
  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this text and all related progress?')
    if (!confirmed) return
    await deleteTextById(textId)
  }

  return (
    <button type="button" className="ghost-button text-card__button" onClick={handleDelete}>
      Delete
    </button>
  )
}
