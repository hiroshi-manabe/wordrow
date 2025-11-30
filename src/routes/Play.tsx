/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { buildChunksForSentence, type ChunkRow } from '../features/play/chunker'
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
  const tokensRevealed = usePlaySessionStore((state) => state.tokensRevealed)
  const liveRowDone = usePlaySessionStore((state) => state.liveRowDone)
  const queuedRowDone = usePlaySessionStore((state) => state.queuedRowDone)
  const bootstrap = usePlaySessionStore((state) => state.bootstrap)
  const handleInput = usePlaySessionStore((state) => state.handleInput)
  const pause = usePlaySessionStore((state) => state.pause)
  const resume = usePlaySessionStore((state) => state.resume)
  const resetSession = usePlaySessionStore((state) => state.reset)
  const applyInputMode = usePlaySessionStore((state) => state.applyInputMode)
  const mistakeVersion = usePlaySessionStore((state) => state.mistakeVersion)
  const inputMode = useSettingsStore((state) => state.inputMode)
  const contextWindowRef = useRef<HTMLDivElement>(null)
  const tokenRefs = useRef<(HTMLSpanElement | null)[]>([])

  const data = useLiveQuery(async (): Promise<PlayData | undefined> => {
    if (!textId) return undefined
    const text = await db.texts.get(textId)
    if (!text) return undefined
    const sentences = await db.sentences.where('textId').equals(textId).sortBy('index')
    return { text, sentences }
  }, [textId])

  const sentences = useMemo(() => {
    if (!data?.text || data.text.id !== textId) {
      return []
    }
    return data.sentences ?? []
  }, [data, textId])

  const prepared = useMemo(() => {
    if (!textId || !sentences.length) {
      return {
        rows: [] as ChunkRow[],
        contextSegments: [] as { tokens: { surface: string; index: number }[] }[],
        totalTokens: 0,
      }
    }

    let absoluteIndex = 0
    const contextSegments = sentences.map((sentence) => {
      const tokens = sentence.surfaceTokens.map((surface) => ({
        surface,
        index: absoluteIndex++,
      }))
      return { tokens }
    })

    const allRows: ChunkRow[] = []
    let tokenOffset = 0
    let handIndex = 0
    let chunkIndex = 0
    sentences.forEach((sentence) => {
      const { rows: sentenceRows, lastHandIndex } = buildChunksForSentence(
        {
          surfaceTokens: sentence.surfaceTokens,
          candidateTokens: sentence.candidateTokens,
          langFull: sentence.langFull,
          seed: sentence.seed,
        },
        { policyVersion: STORAGE_POLICY_VERSION, inputMode, startingHandIndex: handIndex },
      )
      sentenceRows.forEach((row) => {
        allRows.push({
          ...row,
          chunkIndex,
          tokens: row.tokens.map((token) => ({
            ...token,
            absoluteIndex: token.absoluteIndex + tokenOffset,
          })),
        })
        chunkIndex += 1
      })
      tokenOffset += sentence.surfaceTokens.length
      handIndex = lastHandIndex + 1
    })

    return { rows: allRows, contextSegments, totalTokens: absoluteIndex }
  }, [inputMode, sentences, textId])

  const preparedRows = prepared.rows
  const contextSegments = prepared.contextSegments
  const totalTokenBudget = prepared.totalTokens
  const totalRowBudget = preparedRows.length

  const liveRow = sessionLiveRow
  const queuedRow = sessionQueuedRow
  const lastBootstrapKey = useRef<string | undefined>(undefined)
  const rowsKey =
    data?.text && textId ? `${data.text.id}-${data.text.updatedAt}-${inputMode}` : undefined
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
    resetBootstrap()
    resetSession()
  }, [resetSession, textId])

  useEffect(() => {
    tokenRefs.current = new Array(totalTokenBudget).fill(null)
  }, [totalTokenBudget])

  useEffect(() => {
    applyInputMode(inputMode)
  }, [applyInputMode, inputMode])

  useEffect(() => {
    const windowEl = contextWindowRef.current
    if (!windowEl) return
    if (tokensRevealed <= 1) {
      if (typeof windowEl.scrollTo === 'function') {
        windowEl.scrollTo({ top: 0 })
      } else {
        windowEl.scrollTop = 0
      }
      return
    }
    const target = tokenRefs.current[tokensRevealed - 1]
    if (target) {
      const windowRect = windowEl.getBoundingClientRect()
      const tokenRect = target.getBoundingClientRect()
      const delta = tokenRect.top - windowRect.top
      if (Math.abs(delta) > 1) {
        const desired = Math.max(0, windowEl.scrollTop + delta)
        if (typeof windowEl.scrollTo === 'function') {
          windowEl.scrollTo({ top: desired, behavior: 'smooth' })
        } else {
          windowEl.scrollTop = desired
        }
      }
    }
  }, [tokensRevealed])
  useEffect(() => {
    if (!rowsKey) return
    if (lastBootstrapKey.current === rowsKey) return
    lastBootstrapKey.current = rowsKey
    bootstrap(preparedRows, {
      textId: textId ?? null,
      totalRows: totalRowBudget,
      totalTokens: totalTokenBudget,
    })
  }, [bootstrap, preparedRows, rowsKey, textId, totalRowBudget, totalTokenBudget])


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

  const totalRowCount = totalRows || totalRowBudget

  return (
    <section className="play-mobile">
      <header className="play-mobile__header">
        <div className="play-mobile__title">
          <Link
            to="/"
            className="icon-button"
            aria-label="Back to library"
            onClick={resetSession}
          >
            ⌂
          </Link>
          <div>
            <p className="play-mobile__eyebrow">{data.text.langFull}</p>
            <h2>{data.text.title}</h2>
          </div>
        </div>
        <button className="icon-button" type="button" onClick={pause} aria-label="Pause practice">
          ❚❚
        </button>
      </header>

      <div className="play-hud-row">
        <ProgressBar rowsCompleted={hud.rowsCompleted} totalRows={totalRowCount} />
        <Hud hud={hud} />
      </div>

      <div className="play-context">
        <p className="play-context__label">Context line</p>
        <div className="play-context__window" ref={contextWindowRef} lang={data.text.langFull}>
          <div className="context-scroll">
            {contextSegments.map((segment, segmentIdx) => (
              <span key={`segment-${segmentIdx}`} className="context-sentence">
                {segment.tokens.map((token) => {
                  const isRevealed = token.index < tokensRevealed
                  return (
                    <span
                      key={token.index}
                      ref={(el) => {
                        tokenRefs.current[token.index] = el
                      }}
                      className={`context-token${isRevealed ? ' context-token--revealed' : ''}`}
                    >
                      {token.surface}
                    </span>
                  )
                })}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="play-rows play-mobile__rows">
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

      {status === 'paused' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-sheet">
            <h3>Paused</h3>
            <p className="muted">Press Space or Resume to continue.</p>
            <div className="modal-actions">
              <button type="button" className="primary-button" onClick={resume}>
                Resume
              </button>
              <Link to="/" className="ghost-button" onClick={resetSession}>
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

const getHiddenMeasureEl = () => {
  if (typeof document === 'undefined') return null
  let el = document.getElementById('token-measure')
  if (!el) {
    el = document.createElement('p')
    el.id = 'token-measure'
    el.style.position = 'fixed'
    el.style.top = '-9999px'
    el.style.left = '-9999px'
    el.style.visibility = 'hidden'
    el.style.whiteSpace = 'normal'
    el.style.wordBreak = 'break-word'
    el.style.overflowWrap = 'anywhere'
    el.style.hyphens = 'auto'
    el.style.lineHeight = '1.3'
    el.style.fontSize = '1.1rem'
    document.body.appendChild(el)
  }
  return el
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
      <div className="play-row__cards">
        {orderedTokens.map((token, idx) => {
          const isDone = Boolean(done?.[idx])
          const cardClass = `token-card${isDone ? ' token-card--done' : ''}`
          const hintClass = `token-card__hint${isDone ? ' token-card__hint--done' : ''}`
          return (
            <div key={token.absoluteIndex} className={cardClass} lang={token.language}>
              <AdaptiveTokenText text={token.candidate} />
              <p className={hintClass}>{row.labels[idx]}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Hud({ hud }: { hud: HudCounters }) {
  const accuracy =
    hud.tokensAttempted > 0
      ? Math.round((hud.tokensFirstTryCorrect / hud.tokensAttempted) * 100)
      : 0
  const rpm =
    hud.activeMs > 0 ? Math.round((hud.rowsCompleted / (hud.activeMs / 60000)) * 10) / 10 : 0

  return (
    <div className="play-hud">
      <HudStat label="Accuracy" value={`${accuracy}%`} />
      <HudStat label="RPM" value={rpm.toFixed(1)} />
      <HudStat label="Key streak" value={hud.streak.toString()} />
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

function AdaptiveTokenText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text)
  const [scale, setScale] = useState(1)
  const [ellipsized, setEllipsized] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [cardWidth, setCardWidth] = useState(0)

  useEffect(() => {
    setDisplay(text)
    setScale(1)
    setEllipsized(false)
  }, [text])

  useLayoutEffect(() => {
    const cardEl = textRef.current?.parentElement
    if (cardEl) {
      const width = cardEl.clientWidth - 16 // padding
      if (width > 0) setCardWidth(width)
    }
    const measureEl = getHiddenMeasureEl()
    if (!measureEl) return
    measureEl.style.width = `${cardWidth}px`
    measureEl.textContent = display
    const lineHeight = parseFloat(getComputedStyle(textRef.current!).lineHeight)
    const maxLines = window.matchMedia('(max-width: 400px)').matches ? 3 : 2
    const maxHeight = lineHeight * maxLines + 2
    const overflowing =
      measureEl.scrollHeight > maxHeight || measureEl.scrollWidth > (cardWidth || 1) + 1
    if (!overflowing) {
      return
    }
    if (scale === 1) {
      setScale(0.9)
      return
    }
    if (!ellipsized) {
      setDisplay(applyMiddleEllipsis(text))
      setEllipsized(true)
      return
    }
    setDisplay(applyMiddleEllipsis(display, 12, 5))
  }, [display, ellipsized, scale, text, cardWidth])

  return (
    <p
      ref={textRef}
      className="token-card__text"
      style={
        scale === 1
          ? undefined
          : { transform: `scale(${scale})`, transformOrigin: 'top left' }
      }
    >
      {display}
    </p>
  )
}

function applyMiddleEllipsis(input: string, head = 18, tail = 7) {
  const chars = Array.from(input)
  if (chars.length <= head + tail + 1) return input
  const headStr = chars.slice(0, head).join('')
  const tailStr = chars.slice(-tail).join('')
  return `${headStr}…${tailStr}`
}
