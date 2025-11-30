import { Link, useParams } from 'react-router-dom'

export default function StatsRoute() {
  const { textId } = useParams<{ textId: string }>()

  return (
    <section className="section-card">
      <header className="section-header">
        <div>
          <p className="eyebrow">Stats</p>
          <h2>Lifetime metrics landing soon</h2>
        </div>
        <p className="section-description">
          This screen will summarize session accuracy, RPM, and streak history for text
          {textId ? ` ${textId}` : ''} once the play loop writes session entries.
        </p>
      </header>
      <p>
        For now, return to the Library to import passages and verify normalization/tokenization
        behavior via the importer preview.
      </p>
      <Link to="/" className="ghost-button">
        Back to Library
      </Link>
    </section>
  )
}
