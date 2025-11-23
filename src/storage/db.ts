import Dexie from 'dexie'
import type { Table } from 'dexie'

export const STORAGE_POLICY_VERSION = 1

export type Hand = 'left' | 'right'

export interface TextRecord {
  id: string
  title: string
  langFull: string
  langBase: string
  contentHash: string
  createdAt: string
  updatedAt: string
  sentencesCount: number
  policyVersion: number
}

export interface SentenceRecord {
  id: string
  textId: string
  index: number
  surfaceTokens: string[]
  candidateTokens: string[]
  langFull: string
  seed: number
}

export interface RowSnapshot {
  hand: Hand
  order: number[]
  labels: string[]
  expectedIndex: number
  done: boolean[]
}

export interface ProgressRecord {
  id: string
  textId: string
  sentenceIndex: number
  revealIndex: number
  ptr: number
  rowSnapshots: RowSnapshot[]
  updatedAt: string
}

export interface SessionRecord {
  id: string
  textId: string
  tokensTotal: number
  tokensFirstTryCorrect: number
  rowsCompleted: number
  sentencesCompleted: number
  mistakesTotal: number
  activeMs: number
  startedAt: string
  endedAt: string
  rpmSessionAvg: number
  accuracySession: number
}

class WordrowDatabase extends Dexie {
  texts!: Table<TextRecord, string>
  sentences!: Table<SentenceRecord, string>
  progress!: Table<ProgressRecord, string>
  sessions!: Table<SessionRecord, string>

  constructor() {
    super('wordrow')

    this.version(1).stores({
      texts: '&id, contentHash, updatedAt',
      sentences: '&id, textId, index',
      progress: '&id, textId',
      sessions: '&id, textId, endedAt',
    })
  }
}

export const db = new WordrowDatabase()
