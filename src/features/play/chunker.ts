import type { Hand } from '../../storage/db'

export const CHUNK_SIZE = 4

const HAND_KEY_MAP: Record<Hand, string[]> = {
  left: ['A', 'S', 'D', 'F'],
  right: ['J', 'K', 'L', ';'],
}

export interface TokenCard {
  surface: string
  candidate: string
  absoluteIndex: number
}

export interface ChunkRow {
  chunkIndex: number
  hand: Hand
  labels: string[]
  tokens: TokenCard[]
  order: number[]
  expectedOrder: number[]
}

export interface SentenceTokens {
  surfaceTokens: string[]
  candidateTokens: string[]
  seed: number
}

export interface ChunkOptions {
  chunkSize?: number
  policyVersion: number
}

export function buildChunksForSentence(
  sentence: SentenceTokens,
  options: ChunkOptions,
): ChunkRow[] {
  const chunkSize = options.chunkSize ?? CHUNK_SIZE
  const rows: ChunkRow[] = []
  const { surfaceTokens, candidateTokens, seed } = sentence
  let cursor = 0
  let hand: Hand = 'left'

  if (surfaceTokens.length !== candidateTokens.length) {
    throw new Error('Surface tokens and candidate tokens must match in length.')
  }

  while (cursor < surfaceTokens.length) {
    const size = Math.min(chunkSize, surfaceTokens.length - cursor)
    const tokens: TokenCard[] = []
    for (let i = 0; i < size; i += 1) {
      tokens.push({
        surface: surfaceTokens[cursor + i],
        candidate: candidateTokens[cursor + i],
        absoluteIndex: cursor + i,
      })
    }

    const labels = HAND_KEY_MAP[hand].slice(0, size)
    const expectedOrder = tokens.map((_, index) => index)
    const shuffledOrder = shuffleOrder(
      expectedOrder,
      combineSeeds(seed, rows.length, options.policyVersion),
    )

    rows.push({
      chunkIndex: rows.length,
      hand,
      labels,
      tokens,
      order: shuffledOrder,
      expectedOrder,
    })

    cursor += size
    hand = hand === 'left' ? 'right' : 'left'
  }

  return rows
}

function shuffleOrder(order: number[], seed: number): number[] {
  const size = order.length
  if (size <= 1) {
    return [...order]
  }

  const rng = mulberry32(seed)

  if (size === 2) {
    const shouldSwap = rng() >= 0.5
    return shouldSwap ? [order[1], order[0]] : [...order]
  }

  let attempt = 0
  while (attempt < 6) {
    attempt += 1
    const candidate = fisherYatesShuffle(order, rng)
    if (!isSameOrder(candidate, order)) {
      return candidate
    }
  }

  // Fallback: force swap the last two positions to guarantee movement.
  const forced = [...order]
  const last = forced.length - 1
  ;[forced[last], forced[last - 1]] = [forced[last - 1], forced[last]]
  return forced
}

function fisherYatesShuffle(input: number[], rng: () => number): number[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function isSameOrder(nextOrder: number[], original: number[]): boolean {
  return nextOrder.every((value, index) => value === original[index])
}

function combineSeeds(seed: number, chunkIndex: number, policyVersion: number): number {
  let result = seed ^ (policyVersion + 31)
  result = (result + (chunkIndex + 1) * 0x9e3779b1) >>> 0
  result ^= result << 13
  result ^= result >>> 17
  result ^= result << 5
  return result >>> 0
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let result = Math.imul(t ^ (t >>> 15), 1 | t)
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}
