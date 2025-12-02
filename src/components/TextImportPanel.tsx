import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useId, useState } from 'react'
import { importTextFromString } from '../storage/text-service'
import type { TextRecord } from '../storage/db'

interface TextImportPanelProps {
  onImported?: (text: TextRecord) => void
}

type Status = 'idle' | 'busy' | 'success' | 'error'

export default function TextImportPanel({ onImported }: TextImportPanelProps) {
  const textareaId = useId()
  const [rawInput, setRawInput] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Paste a UTF-8 text file or select one to import.')
  const [showHelp, setShowHelp] = useState(false)

  const handleFileSelection = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const contents = await file.text()
    setRawInput(contents)
    setFileName(file.name)
    setMessage(`Loaded ${file.name}. Review and press Import to continue.`)
    setStatus('idle')
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!rawInput.trim()) {
        setStatus('error')
        setMessage('Provide text first. The first line must be a title.')
        return
      }

      try {
        setStatus('busy')
        setMessage('Parsing and storing text…')
        const { text } = await importTextFromString(rawInput)
        setStatus('success')
        setMessage(`Imported "${text.title}" · ${text.sentencesCount} sentences (${text.langFull})`)
        setRawInput('')
        setFileName(null)
        onImported?.(text)
      } catch (error) {
        const details = error instanceof Error ? error.message : 'Unknown import failure.'
        setStatus('error')
        setMessage(details)
      }
    },
    [onImported, rawInput],
  )

  return (
    <section className="section-card import-panel">
      <header className="section-header">
        <div>
          <p className="eyebrow">Import</p>
          <h2>Bring your own text</h2>
        </div>
        <div className="library-actions">
          <button type="button" className="ghost-button" onClick={() => setShowHelp((v) => !v)}>
            {showHelp ? 'Hide guide' : 'Import guide'}
          </button>
        </div>
      </header>
      <form className="import-form" onSubmit={handleSubmit}>
        <label htmlFor={textareaId} className="input-label">
          Paste text
        </label>
        <textarea
          id={textareaId}
          className="import-textarea"
          placeholder={'My Text\nlang=en\nSentence one.\nSentence two.'}
          spellCheck={false}
          rows={6}
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
        />
        {showHelp ? (
          <div className="import-help muted">
            <p>
              Line 1 is the title. Line 2 optionally starts with <code>lang=&lt;tag&gt;</code>. Every
              following line is a sentence (no auto-segmentation).
            </p>
            <p>
              You can paste or pick a .txt file; this box is just for review/editing before you
              import.
            </p>
          </div>
        ) : null}
        <div className="import-controls">
          <label className="file-input">
            <input type="file" accept=".txt" onChange={handleFileSelection} />
            <span>Select .txt file</span>
          </label>
          {fileName && <span className="file-input__name">{fileName}</span>}
          <div className="import-controls__spacer" />
          <button type="submit" className="primary-button" disabled={status === 'busy'}>
            {status === 'busy' ? 'Importing…' : 'Import text'}
          </button>
        </div>
        <p className={`import-status import-status--${status}`} role="status" aria-live="polite">
          {message}
        </p>
      </form>
    </section>
  )
}
