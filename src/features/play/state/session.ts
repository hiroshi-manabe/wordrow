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
  textId: string | null
  revealIndex: number
  lastActiveAt: number | null
  liveRow?: ChunkRow
  liveRowDone: boolean[] | null
  queuedRow?: ChunkRow
  queuedRowDone: boolean[] | null
  pendingRows: ChunkRow[]
  pendingRowsDone: boolean[][]
  totalRows: number
  totalTokens: number
  tokensRevealed: number
  hud: HudCounters
  status: 'idle' | 'ready' | 'paused' | 'completed'
  mistakeVersion: number
}

interface PlaySessionActions {
  bootstrap: (
    rows: ChunkRow[],
    meta: { textId: string | null; totalRows: number; totalTokens: number },
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
  textId: null,
  revealIndex: 0,
  lastActiveAt: null,
  liveRowDone: null,
  queuedRowDone: null,
  pendingRows: [],
  pendingRowsDone: [],
  totalRows: 0,
  totalTokens: 0,
  tokensRevealed: 0,
  hud: createDefaultHud(),
  status: 'idle',
  mistakeVersion: 0,
}

export const usePlaySessionStore = create<PlaySessionState & PlaySessionActions>((set) => ({
  ...initialState,
  bootstrap: (
    rows: ChunkRow[],
    meta: { textId: string | null; totalRows: number; totalTokens: number },
  ) => {
    const updateHud = (existing: HudCounters | undefined) =>
      existing
        ? { ...existing, tokensTotal: meta.totalTokens }
        : { ...createDefaultHud(), tokensTotal: meta.totalTokens }

    if (!rows.length) {
      set((state) => ({
        textId: meta.textId ?? null,
        status: 'idle',
        liveRow: undefined,
        liveRowDone: null,
        queuedRow: undefined,
        queuedRowDone: null,
        pendingRows: [],
        pendingRowsDone: [],
        totalRows: meta.totalRows,
        totalTokens: meta.totalTokens,
        hud: updateHud(state.hud),
        tokensRevealed: 0,
        mistakeVersion: 0,
        revealIndex: 0,
        lastActiveAt: null,
      }))
      return
    }

    const liveRow = rows[0]
    const queuedRow = rows[1]
    const pendingRows = rows.slice(2)

    set((state) => ({
      textId: meta.textId ?? null,
      liveRow,
      liveRowDone: liveRow ? createDoneArray(liveRow) : null,
      queuedRow,
      queuedRowDone: queuedRow ? createDoneArray(queuedRow) : null,
      pendingRows,
      pendingRowsDone: pendingRows.map((row) => createDoneArray(row)),
      totalRows: meta.totalRows,
      totalTokens: meta.totalTokens,
      revealIndex: 0,
      tokensRevealed: 0,
      status: 'ready',
      mistakeVersion: 0,
      hud: updateHud(state.hud),
      lastActiveAt: Date.now(),
    }))
  },
  handleInput: (label: string) => {
    set((state) => {
      if (state.status !== 'ready' || !state.liveRow || !state.liveRowDone) {
        return state
      }

      const now = Date.now()
      const elapsed = state.lastActiveAt ? Math.max(0, now - state.lastActiveAt) : 0
      const hudWithTime =
        elapsed > 0 ? { ...state.hud, activeMs: state.hud.activeMs + elapsed } : state.hud

      const targetIndex = state.liveRow.labels.indexOf(label)
      if (targetIndex === -1) {
        return {
          ...state,
          hud: {
            ...hudWithTime,
            mistakesTotal: hudWithTime.mistakesTotal + 1,
            tokensAttempted: hudWithTime.tokensAttempted + 1,
            streak: 0,
          },
          mistakeVersion: state.mistakeVersion + 1,
          lastActiveAt: now,
        }
      }

      if (state.liveRowDone[targetIndex]) {
        return {
          ...state,
          hud: hudWithTime,
          lastActiveAt: now,
        }
      }

      const missState = {
        ...state,
        hud: {
          ...hudWithTime,
          mistakesTotal: hudWithTime.mistakesTotal + 1,
          tokensAttempted: hudWithTime.tokensAttempted + 1,
          streak: 0,
        },
        mistakeVersion: state.mistakeVersion + 1,
        lastActiveAt: now,
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
      const tokensRevealed = state.tokensRevealed + 1
      const nextHud: HudCounters = {
        ...hudWithTime,
        tokensAttempted: hudWithTime.tokensAttempted + 1,
        tokensFirstTryCorrect: hudWithTime.tokensFirstTryCorrect + 1,
        rowsCompleted: rowCompleted ? hudWithTime.rowsCompleted + 1 : hudWithTime.rowsCompleted,
        streak: hudWithTime.streak + 1,
      }

      if (!rowCompleted) {
        return {
          ...state,
          revealIndex: nextRevealIndex,
          tokensRevealed,
          liveRowDone: updatedLiveRowDone,
          hud: nextHud,
          lastActiveAt: now,
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
        tokensRevealed,
        hud: nextHud,
        status: promotedRow ? 'ready' : 'completed',
        lastActiveAt: promotedRow ? now : null,
      }
    })
  },
  pause: () =>
    set((state) => {
      if (state.status !== 'ready') return state
      const now = Date.now()
      const elapsed = state.lastActiveAt ? Math.max(0, now - state.lastActiveAt) : 0
      const hud = elapsed > 0 ? { ...state.hud, activeMs: state.hud.activeMs + elapsed } : state.hud
      return { ...state, status: 'paused', hud, lastActiveAt: null }
    }),
  resume: () =>
    set((state) =>
      state.status === 'paused' ? { ...state, status: 'ready', lastActiveAt: Date.now() } : state,
    ),
  applyInputMode: (mode: InputMode) =>
    set((state) => ({
      ...state,
      liveRow: retargetRowForMode(state.liveRow, mode),
      queuedRow: retargetRowForMode(state.queuedRow, mode),
      pendingRows: state.pendingRows.map((row) => retargetRowForMode(row, mode)!) as ChunkRow[],
    })),
  reset: () => set(initialState),
}))
