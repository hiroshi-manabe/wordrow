import { create } from 'zustand'
import type { ChunkRow } from '../chunker'
import { retargetRowForMode } from '../chunker'
import type { InputMode } from '../../settings/types'

export interface HudCounters {
  tokensTotal: number
  tokensAttempted: number
  tokensFirstTryCorrect: number
  rowsCompleted: number
  mistakesTotal: number
  streak: number
  activeMs: number
}

export interface PlaySessionState {
  sentenceIndex: number
  revealIndex: number
  liveRow?: ChunkRow
  liveRowDone: boolean[] | null
  queuedRow?: ChunkRow
  queuedRowDone: boolean[] | null
  pendingRows: ChunkRow[]
  pendingRowsDone: boolean[][]
  totalRows: number
  sentenceRevealCount: number
  hud: HudCounters
  status: 'idle' | 'ready' | 'paused' | 'completed'
  mistakeVersion: number
}

interface PlaySessionActions {
  bootstrap: (
    rows: ChunkRow[],
    meta: { sentenceIndex: number; totalRows: number; totalTokens: number },
  ) => void
  handleInput: (label: string) => void
  pause: () => void
  resume: () => void
  applyInputMode: (mode: InputMode) => void
  reset: () => void
}

const createDefaultHud = (): HudCounters => ({
  tokensTotal: 0,
  tokensAttempted: 0,
  tokensFirstTryCorrect: 0,
  rowsCompleted: 0,
  mistakesTotal: 0,
  streak: 0,
  activeMs: 0,
})

const createDoneArray = (row?: ChunkRow | null): boolean[] =>
  row ? new Array(row.labels.length).fill(false) : []

const initialState: PlaySessionState = {
  sentenceIndex: 0,
  revealIndex: 0,
  liveRowDone: null,
  queuedRowDone: null,
  pendingRows: [],
  pendingRowsDone: [],
  totalRows: 0,
  sentenceRevealCount: 0,
  hud: createDefaultHud(),
  status: 'idle',
  mistakeVersion: 0,
}

export const usePlaySessionStore = create<PlaySessionState & PlaySessionActions>((set) => ({
  ...initialState,
  bootstrap: (
    rows: ChunkRow[],
    meta: { sentenceIndex: number; totalRows: number; totalTokens: number },
  ) => {
    const updateHud = (existing: HudCounters | undefined) =>
      existing
        ? { ...existing, tokensTotal: meta.totalTokens }
        : { ...createDefaultHud(), tokensTotal: meta.totalTokens }

    if (!rows.length) {
      set((state) => ({
        status: 'idle',
        liveRow: undefined,
        liveRowDone: null,
        queuedRow: undefined,
        queuedRowDone: null,
        pendingRows: [],
        pendingRowsDone: [],
        totalRows: meta.totalRows,
        hud: updateHud(state.hud),
        sentenceRevealCount: 0,
        mistakeVersion: 0,
        sentenceIndex: meta.sentenceIndex,
      }))
      return
    }

    const liveRow = rows[0]
    const queuedRow = rows[1]
    const pendingRows = rows.slice(2)

    set((state) => ({
      liveRow,
      liveRowDone: liveRow ? createDoneArray(liveRow) : null,
      queuedRow,
      queuedRowDone: queuedRow ? createDoneArray(queuedRow) : null,
      pendingRows,
      pendingRowsDone: pendingRows.map((row) => createDoneArray(row)),
      totalRows: meta.totalRows,
      sentenceIndex: meta.sentenceIndex,
      revealIndex: 0,
      sentenceRevealCount: 0,
      status: 'ready',
      mistakeVersion: 0,
      hud: updateHud(state.hud),
    }))
  },
  handleInput: (label: string) => {
    set((state) => {
      if (state.status !== 'ready' || !state.liveRow || !state.liveRowDone) {
        return state
      }

      const targetIndex = state.liveRow.labels.indexOf(label)
      if (targetIndex === -1) {
        return {
          ...state,
          hud: {
            ...state.hud,
            mistakesTotal: state.hud.mistakesTotal + 1,
            tokensAttempted: state.hud.tokensAttempted + 1,
            streak: 0,
          },
          mistakeVersion: state.mistakeVersion + 1,
        }
      }

      if (state.liveRowDone[targetIndex]) {
        return state
      }

      const missState = {
        ...state,
        hud: {
          ...state.hud,
          mistakesTotal: state.hud.mistakesTotal + 1,
          tokensAttempted: state.hud.tokensAttempted + 1,
          streak: 0,
        },
        mistakeVersion: state.mistakeVersion + 1,
      }

      const isCorrect = state.liveRow.order[targetIndex] === state.revealIndex
        || state.liveRow.tokens[state.liveRow.order[targetIndex]].candidate ===
          state.liveRow.tokens[state.revealIndex].candidate

      if (!isCorrect) {
        return missState
      }

      const updatedLiveRowDone = [...state.liveRowDone]
      updatedLiveRowDone[targetIndex] = true

      const nextRevealIndex = state.revealIndex + 1
      const rowCompleted = nextRevealIndex >= state.liveRow.tokens.length
      const nextSentenceReveal = state.sentenceRevealCount + 1
      const nextHud: HudCounters = {
        ...state.hud,
        tokensAttempted: state.hud.tokensAttempted + 1,
        tokensFirstTryCorrect: state.hud.tokensFirstTryCorrect + 1,
        rowsCompleted: rowCompleted ? state.hud.rowsCompleted + 1 : state.hud.rowsCompleted,
        streak: rowCompleted ? state.hud.streak + 1 : state.hud.streak,
      }

      if (!rowCompleted) {
        return {
          ...state,
          revealIndex: nextRevealIndex,
          sentenceRevealCount: nextSentenceReveal,
          liveRowDone: updatedLiveRowDone,
          hud: nextHud,
        }
      }

      const promotedRow = state.queuedRow
      const [nextQueuedRow, ...restPending] = state.pendingRows
      const [nextQueuedRowDone, ...restPendingDone] = state.pendingRowsDone

      return {
        ...state,
        liveRow: promotedRow,
        liveRowDone: promotedRow ? state.queuedRowDone ?? createDoneArray(promotedRow) : null,
        queuedRow: nextQueuedRow,
        queuedRowDone: nextQueuedRow ? nextQueuedRowDone ?? createDoneArray(nextQueuedRow) : null,
        pendingRows: restPending,
        pendingRowsDone: restPendingDone,
        revealIndex: 0,
        sentenceRevealCount: nextSentenceReveal,
        hud: nextHud,
        status: promotedRow ? 'ready' : 'completed',
      }
    })
  },
  pause: () => set((state) => (state.status === 'ready' ? { ...state, status: 'paused' } : state)),
  resume: () => set((state) => (state.status === 'paused' ? { ...state, status: 'ready' } : state)),
  applyInputMode: (mode: InputMode) =>
    set((state) => ({
      ...state,
      liveRow: retargetRowForMode(state.liveRow, mode),
      queuedRow: retargetRowForMode(state.queuedRow, mode),
      pendingRows: state.pendingRows.map((row) => retargetRowForMode(row, mode)!) as ChunkRow[],
    })),
  reset: () => set(initialState),
}))
