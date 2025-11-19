import { useEffect, useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { buildChunksForSentence, CHUNK_SIZE, type ChunkRow } from '../features/play/chunker'
import { usePlaySessionStore, type HudCounters } from '../features/play/state/session'
import { useSettingsStore } from '../features/settings/store'
import { db, STORAGE_POLICY_VERSION, type SentenceRecord, type TextRecord } from '../storage/db'

interface PlayData {
  text: TextRecord
  sentences: SentenceRecord[]
}

const KEY_LABELS: Record<string, string> = {
  KeyA: 'A',
  KeyS: 'S',
  KeyD: 'D',
  KeyF: 'F',
  KeyJ: 'J',
  KeyK: 'K',
  KeyL: 'L',
  Semicolon: ';',
  Space: 'Space',
}

export default function PlayRoute() {
  const { textId } = useParams<{ textId: string }>()
  const sessionLiveRow = usePlaySessionStore((state) => state.liveRow)
  const sessionQueuedRow = usePlaySessionStore((state) => state.queuedRow)
  const status = usePlaySessionStore((state) => state.status)
  const hud = usePlaySessionStore((state) => state.hud)
  const totalRows = usePlaySessionStore((state) => state.totalRows)
  const sentenceRevealCount = usePlaySessionStore((state) => state.sentenceRevealCount)
  const liveRowDone = usePlaySessionStore((state) => state.liveRowDone)
  const queuedRowDone = usePlaySessionStore((state) => state.queuedRowDone)
  const sentenceIndex = usePlaySessionStore((state) => state.sentenceIndex)
  const bootstrap = usePlaySessionStore((state) => state.bootstrap)
  const handleInput = usePlaySessionStore((state) => state.handleInput)
  const pause = usePlaySessionStore((state) => state.pause)
  const resume = usePlaySessionStore((state) => state.resume)
  const resetSession = usePlaySessionStore((state) => state.reset)
  const applyInputMode = usePlaySessionStore((state) => state.applyInputMode)
  const mistakeVersion = usePlaySessionStore((state) => state.mistakeVersion)
  const inputMode = useSettingsStore((state) => state.inputMode)

  const data = useLiveQuery(async (): Promise<PlayData | undefined> => {
    if (!textId) return undefined
    const text = await db.texts.get(textId)
    if (!text) return undefined
    const sentences = await db.sentences.where('textId').equals(textId).sortBy('index')
    return { text, sentences }
  }, [textId])

  const sentences = useMemo(() => data?.sentences ?? [], [data])
  const activeSentence = sentences[sentenceIndex] ?? sentences[0]
  const totalRowBudget = useMemo(
    () =>
      sentences.reduce(
        (sum, sentence) => sum + Math.ceil(sentence.surfaceTokens.length / CHUNK_SIZE),
        0,
      ),
    [sentences],
  )
  const totalTokenBudget = useMemo(
    () => sentences.reduce((sum, sentence) => sum + sentence.surfaceTokens.length, 0),
    [sentences],
  )

  const sentenceKey = activeSentence
    ? `${textId ?? 'unknown'}-${activeSentence.index}-${activeSentence.seed}`
    : undefined

  const liveRow = sessionLiveRow
  const queuedRow = sessionQueuedRow
  const lastBootstrapKey = useRef<string | undefined>(undefined)
  const resetBootstrap = () => {
    lastBootstrapKey.current = undefined
  }

  useEffect(() => {
    return () => {
      resetBootstrap()
      resetSession()
    }
  }, [resetSession])

  useEffect(() => {
    applyInputMode(inputMode)
  }, [applyInputMode, inputMode])
  useEffect(() => {
    if (!sentenceKey || !activeSentence) {
      if (lastBootstrapKey.current !== undefined) {
        bootstrap([], {
          sentenceIndex: 0,
          totalRows: totalRowBudget,
          totalTokens: totalTokenBudget,
        })
        resetBootstrap()
      }
      return
    }
    if (lastBootstrapKey.current === sentenceKey) return
    lastBootstrapKey.current = sentenceKey
    const rows = buildChunksForSentence(
      {
        surfaceTokens: activeSentence.surfaceTokens,
        candidateTokens: activeSentence.candidateTokens,
        seed: activeSentence.seed,
      },
      { policyVersion: STORAGE_POLICY_VERSION, inputMode },
    )
    const currentIndex = sentences.findIndex((s) => s.index === activeSentence.index)
    bootstrap(rows, {
      sentenceIndex: currentIndex === -1 ? 0 : currentIndex,
      totalRows: totalRowBudget,
      totalTokens: totalTokenBudget,
    })
  }, [activeSentence, bootstrap, inputMode, sentenceKey, sentences, totalRowBudget, totalTokenBudget])

  useEffect(() => {
    if (!sentences.length) return
    if (status !== 'completed') return
    const nextIndex = sentenceIndex + 1
    if (nextIndex >= sentences.length) return
    const nextSentence = sentences[nextIndex]
    if (!nextSentence) return
    const rows = buildChunksForSentence(
      {
        surfaceTokens: nextSentence.surfaceTokens,
        candidateTokens: nextSentence.candidateTokens,
        seed: nextSentence.seed,
      },
      { policyVersion: STORAGE_POLICY_VERSION, inputMode },
    )
    const nextKey = `${textId ?? 'unknown'}-${nextSentence.index}-${nextSentence.seed}`
    if (lastBootstrapKey.current === nextKey) return
    lastBootstrapKey.current = nextKey
    bootstrap(rows, { sentenceIndex: nextIndex, totalRows: totalRowBudget, totalTokens: totalTokenBudget })
  }, [bootstrap, inputMode, sentenceIndex, sentences, status, textId, totalRowBudget, totalTokenBudget])

  useEffect(() => {
    if (status !== 'ready') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return
      const label = KEY_LABELS[event.code]
      if (!label) return
      if (label === 'Space') {
        event.preventDefault()
        pause()
        return
      }
      if (!sessionLiveRow || !sessionLiveRow.labels.includes(label)) return
      event.preventDefault()
      handleInput(label)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleInput, pause, sessionLiveRow, status])

  if (!textId) {
    return <MissingState message="No text selected." />
  }

  if (!data) {
    return <LoadingState />
  }

  if (!data.text) {
    return <MissingState message="We could not find that text. Return to the library." />
  }

  if (!data.sentences.length) {
    return <MissingState message="This text is empty. Import sentences before practicing." />
  }

  const totalRowCount =
    totalRows || Math.ceil((activeSentence?.surfaceTokens.length ?? 0) / CHUNK_SIZE)

  return (
    <section className="section-card play-card">
      <header className="section-header">
        <div>
          <p className="eyebrow">Practice</p>
          <h2>{data.text.title}</h2>
        </div>
        <p className="section-description">
          Live keyboard loop preview for sentence 1 · {data.sentences.length}. These rows already
          respond to ASDF/JKL; inputs with deterministic shuffles and HUD updates.
        </p>
      </header>

      <div className="play-context">
        <p className="play-context__label">Context line</p>
        <p className="play-context__text" lang={data.text.langFull}>
          {activeSentence.surfaceTokens.map((token, idx) => {
            const isRevealed = idx < sentenceRevealCount
            return (
              <span
                key={`${token}-${idx}`}
                className={`context-token${isRevealed ? ' context-token--revealed' : ''}`}
              >
                {token}
                {idx < activeSentence.surfaceTokens.length - 1 ? ' ' : ''}
              </span>
            )
          })}
        </p>
      </div>

      <Hud hud={hud} status={status} />

      <ProgressBar rowsCompleted={hud.rowsCompleted} totalRows={totalRowCount} />

      <div className="play-rows">
        {liveRow ? (
          <RowPreview
            key={`live-${mistakeVersion}`}
            row={liveRow}
            status="active"
            done={liveRowDone}
            mistakeVersion={mistakeVersion}
          />
        ) : (
          <p className="muted">No rows yet.</p>
        )}
        {queuedRow ? (
          <RowPreview row={queuedRow} status="queued" done={queuedRowDone} mistakeVersion={0} />
        ) : null}
      </div>

      <footer className="play-footer">
        <div>
          <p className="eyebrow">Controls</p>
          <p className="muted">
            Left hand controls (ASDF) drive the live row, right hand controls (JKL;) prep the queued
            row. Mistakes flash the active row; rows alternate hands every chunk as you progress.
          </p>
        </div>
        <div className="play-actions">
          <button type="button" className="ghost-button" onClick={pause} disabled={status === 'paused'}>
            Pause (Space)
          </button>
          <Link
            to="/"
            className="ghost-button"
            onClick={resetSession}
          >
            Back to Library
          </Link>
        </div>
      </footer>
      {status === 'paused' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-sheet">
            <h3>Paused</h3>
            <p className="muted">Press Space or Resume to continue.</p>
            <div className="modal-actions">
              <button type="button" className="primary-button" onClick={resume}>
                Resume
              </button>
              <Link
                to="/"
                className="ghost-button"
                onClick={resetSession}
              >
                Back to Library (resets session)
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function LoadingState() {
  return (
    <section className="section-card">
      <p className="muted">Loading text…</p>
    </section>
  )
}

function MissingState({ message }: { message: string }) {
  return (
    <section className="section-card">
      <p className="muted">{message}</p>
      <Link to="/" className="ghost-button">
        Return to Library
      </Link>
    </section>
  )
}

function RowPreview({
  row,
  status,
  done,
  mistakeVersion,
}: {
  row: ChunkRow
  status: 'active' | 'queued'
  done: boolean[] | null | undefined
  mistakeVersion: number
}) {
  const orderedTokens = row.order.map((index) => row.tokens[index])
  const className = `play-row play-row--${status}${mistakeVersion ? ' play-row--mistake' : ''}`

  return (
    <div className={className} data-hand={row.hand}>
      <div className="play-row__labels">
        {row.labels.map((label, index) => {
          const isDone = Boolean(done?.[index])
          return (
            <span
              key={label}
              className={`play-row__label${isDone ? ' play-row__label--done' : ''}`}
            >
              {label}
            </span>
          )
        })}
      </div>
      <div className="play-row__cards">
        {orderedTokens.map((token, idx) => {
          const isDone = Boolean(done?.[idx])
          const cardClass = `token-card${isDone ? ' token-card--done' : ''}`
          const hintClass = `token-card__hint${isDone ? ' token-card__hint--done' : ''}`
          return (
            <div key={token.absoluteIndex} className={cardClass} lang="auto">
              <p className="token-card__text">{token.candidate}</p>
              <p className={hintClass}>{row.labels[idx]}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Hud({ hud, status }: { hud: HudCounters; status: string }) {
  const accuracy =
    hud.tokensAttempted > 0
      ? Math.round((hud.tokensFirstTryCorrect / hud.tokensAttempted) * 100)
      : 0

  return (
    <div className="play-hud">
      <HudStat label="Accuracy" value={`${accuracy}%`} />
      <HudStat label="Rows" value={hud.rowsCompleted.toString()} />
      <HudStat label="Streak" value={hud.streak.toString()} />
      <HudStat label="Status" value={status === 'completed' ? 'Completed' : 'Ready'} />
    </div>
  )
}

function ProgressBar({ rowsCompleted, totalRows }: { rowsCompleted: number; totalRows: number }) {
  const percent = totalRows > 0 ? Math.min(100, Math.round((rowsCompleted / totalRows) * 100)) : 0
  return (
    <div className="play-progress">
      <div className="play-progress__info">
        <span>{percent}%</span>
        <span>
          {rowsCompleted}/{totalRows} rows
        </span>
      </div>
      <div className="play-progress__track">
        <div className="play-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function HudStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-stat">
      <p className="hud-stat__label">{label}</p>
      <p className="hud-stat__value">{value}</p>
    </div>
  )
}
