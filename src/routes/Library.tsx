import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import TextImportPanel from '../components/TextImportPanel'
import type { TextRecord } from '../storage/db'
import { db } from '../storage/db'
import { deleteTextById } from '../storage/delete-text'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function LibraryRoute() {
  const texts = useLiveQuery(() => db.texts.orderBy('updatedAt').reverse().toArray(), [])

  return (
    <div className="library-grid">
      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Library</p>
            <h2>Your texts</h2>
          </div>
          <p className="section-description">
            Import a text to begin practicing word-order recall. Each line becomes a sentence and
            stays deterministic thanks to per-sentence seeds.
          </p>
        </header>
        {renderLibraryContents(texts)}
      </section>
      <TextImportPanel />
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
